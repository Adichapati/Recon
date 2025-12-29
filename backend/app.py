import os
import time

from typing import Optional

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)

app = Flask(__name__)
CORS(app)


def tmdb_get(
    path: str,
    *,
    params=None,
    soft_fail: bool = True,
    retries: int = 1,
):
    api_key = os.getenv("TMDB_API_KEY")
    if not api_key:
        return None, (jsonify({"error": "TMDB_API_KEY not set"}), 500)

    base_url = "https://api.themoviedb.org/3"
    url = f"{base_url}{path}"

    headers = {}
    query_params = dict(params or {})

    # TMDB supports either:
    # - v3 API key via ?api_key=...
    # - v4 read access token via Authorization: Bearer ...
    if api_key.lower().startswith("bearer "):
        headers["Authorization"] = api_key
    else:
        query_params["api_key"] = api_key

    response = None
    last_exc = None
    for attempt in range(max(0, int(retries)) + 1):
        try:
            response = requests.get(url, params=query_params, headers=headers, timeout=10)
        except requests.RequestException as exc:
            last_exc = exc
            if attempt < retries:
                time.sleep(0.25)
                continue

            if soft_fail:
                # In dev mode, Next.js can trigger duplicate / cancelled requests (e.g. Strict Mode).
                # Treat transient upstream failures as non-fatal.
                return (
                    {"results": [], "warning": "TMDB request failed or was interrupted"},
                    None,
                )

            return None, (
                jsonify({"error": "TMDB request failed or was interrupted"}),
                502,
            )

        # Retry common transient upstream errors.
        if response is not None and response.status_code in (429, 500, 502, 503, 504) and attempt < retries:
            time.sleep(0.25)
            continue
        break

    if response is None:
        # Should be unreachable, but keep a safe fallback.
        if soft_fail:
            return ({"results": [], "warning": "TMDB request failed"}, None)
        return None, (jsonify({"error": "TMDB request failed"}), 502)

    try:
        payload = response.json()
    except ValueError:
        if soft_fail:
            return (
                {"results": [], "warning": "TMDB returned an invalid response"},
                None,
            )

        return None, (
            jsonify({"error": "TMDB returned an invalid response"}),
            200,
        )

    if not response.ok:
        if soft_fail:
            # Avoid hard failures in dev; return a 200 with an empty result set.
            return (
                {
                    "results": [],
                    "warning": "TMDB returned an error",
                    "tmdb_status": response.status_code,
                    "tmdb_error": payload,
                },
                None,
            )

        if response.status_code == 404:
            return None, (jsonify({"error": "Invalid movie ID"}), 404)

        return None, (
            jsonify(
                {
                    "error": "TMDB returned an error",
                    "tmdb_status": response.status_code,
                    "tmdb_error": payload,
                }
            ),
            500,
        )

    return payload, None


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/movies/popular")
def popular_movies():
    payload, error_response = tmdb_get(
        "/movie/popular",
        params={"language": "en-US", "page": 1},
    )
    if error_response is not None:
        return error_response

    return jsonify(payload)


@app.get("/api/movies/trending")
def trending_movies():
    payload, error_response = tmdb_get(
        "/trending/movie/week",
        params={"language": "en-US"},
    )
    if error_response is not None:
        return error_response

    return jsonify(payload)


@app.get("/api/movies/<movie_id>")
def movie_details(movie_id: str):
    if not movie_id or not movie_id.isdigit() or int(movie_id) <= 0:
        return jsonify({"error": "Invalid movie ID"}), 400

    payload, error_response = tmdb_get(
        f"/movie/{movie_id}",
        params={"language": "en-US"},
        soft_fail=False,
    )
    if error_response is not None:
        return error_response

    tmdb_image_base_url = "https://image.tmdb.org/t/p/w500"

    def build_image_url(path: Optional[str]):
        if not path:
            return ""
        return f"{tmdb_image_base_url}{path}"

    genres = payload.get("genres", [])
    if not isinstance(genres, list):
        genres = []

    mapped = {
        "id": payload.get("id"),
        "title": payload.get("title") or payload.get("name") or "Untitled",
        "overview": payload.get("overview") or "",
        "poster_path": build_image_url(payload.get("poster_path")),
        "backdrop_path": build_image_url(payload.get("backdrop_path")),
        "release_date": payload.get("release_date") or "1970-01-01",
        "vote_average": payload.get("vote_average") if isinstance(payload.get("vote_average"), (int, float)) else 0,
        "genres": [g.get("name") for g in genres if isinstance(g, dict) and g.get("name")],
    }

    return jsonify(mapped)


@app.get("/api/movies/search")
def search_movies():
    query = request.args.get("query", "")
    if not query or not query.strip():
        return jsonify({"results": []})

    payload, error_response = tmdb_get(
        "/search/multi",
        params={
            "query": query,
            "include_adult": "false",
            "language": "en-US",
            "page": 1,
        },
    )

    if error_response is not None:
        return error_response

    results = []
    for item in payload.get("results", []):
        if item.get("media_type") in ["movie", "tv"] and item.get("poster_path"):
            results.append(item)

    return jsonify({"results": results})


def get_movie_keywords(movie_id: int):
    """Fetch keywords for a movie from TMDB"""
    payload, error_response = tmdb_get(
        f"/movie/{movie_id}/keywords",
        soft_fail=False
    )
    if error_response is not None:
        return []
    return [kw["name"] for kw in payload.get("keywords", [])]


def calculate_similarity(main_movie: dict, candidate_movie: dict) -> tuple[float, str]:
    """
    Calculate similarity score between two movies based on:
    - Genre overlap (70% weight) - dominant factor
    - Overview keyword similarity (20% weight) - medium factor
    - Popularity (5% weight) - tie-breaker only
    - Recency (5% weight) - small bias toward newer movies
    
    Args:
        main_movie: Dictionary containing the main movie details
        candidate_movie: Dictionary containing the candidate movie details
        
    Returns:
        tuple[float, str]: (similarity_score between 0 and 1, reason string)
    """
    def safe_get(d, *keys, default=None):
        """Safely get nested dictionary keys"""
        for key in keys:
            try:
                d = d[key]
            except (TypeError, KeyError, AttributeError):
                return default
            if d is None:
                return default
        return d

    try:
        # Ensure inputs are valid dictionaries
        if not main_movie or not candidate_movie or not isinstance(main_movie, dict) or not isinstance(candidate_movie, dict):
            return 0.0, "Invalid movie data"

        # Safely extract genres
        def get_genres(movie):
            genres = safe_get(movie, "genres", default=[])
            if not isinstance(genres, list):
                return set()
            return {
                str(g.get("name", "")).lower()
                for g in genres
                if g and isinstance(g, dict) and g.get("name")
            }

        main_genres = get_genres(main_movie)
        candidate_genres = get_genres(candidate_movie)

        # Calculate genre similarity (70% weight)
        intersection = len(main_genres & candidate_genres)
        union = len(main_genres | candidate_genres) or 1  # Avoid division by zero
        genre_similarity = intersection / union
        
        # Check for near-duplicate genres (penalty)
        genre_penalty = 0.0
        if intersection >= 3 and len(main_genres) <= 4 and len(candidate_genres) <= 4:
            # If they share most genres and both have few genres, penalize heavily
            genre_penalty = 0.3
        
        # Check for similar titles (penalty)
        title_penalty = 0.0
        main_title = str(safe_get(main_movie, "title", "")).lower()
        candidate_title = str(safe_get(candidate_movie, "title", "")).lower()
        if main_title and candidate_title:
            # Simple similarity check for titles
            common_words = set(main_title.split()) & set(candidate_title.split())
            if len(common_words) >= 2:
                title_penalty = 0.2
        
        # Overview keyword similarity (20% weight)
        main_overview = set(str(safe_get(main_movie, "overview", default="")).lower().split())
        candidate_overview = set(str(safe_get(candidate_movie, "overview", default="")).lower().split())
        
        intersection = len(main_overview & candidate_overview)
        union = len(main_overview | candidate_overview) or 1  # Avoid division by zero
        overview_similarity = intersection / union
        
        # Popularity bias (5% weight, normalized 0-1, capped to prevent dominance)
        try:
            popularity = float(safe_get(candidate_movie, "popularity", default=0) or 0)
            popularity_score = min(1.0, popularity / 200.0)  # Higher cap to reduce impact
        except (TypeError, ValueError):
            popularity_score = 0.0
        
        # Recency bias (5% weight) - bias toward movies from last 5 years
        try:
            candidate_date = safe_get(candidate_movie, "release_date", default="")
            if candidate_date:
                from datetime import datetime
                release_year = datetime.strptime(candidate_date[:10], "%Y-%m-%d").year
                current_year = datetime.now().year
                years_diff = current_year - release_year
                recency_score = max(0.0, 1.0 - (years_diff / 10.0))  # Linear decay over 10 years
            else:
                recency_score = 0.0
        except (ValueError, TypeError):
            recency_score = 0.0
        
        # Calculate weighted score (ensuring it's between 0 and 1)
        score = 0.0
        score += 0.7 * genre_similarity
        score += 0.2 * overview_similarity
        score += 0.05 * popularity_score
        score += 0.05 * recency_score
        
        # Apply penalties
        score = max(0.0, score - genre_penalty - title_penalty)
        score = max(0.0, min(1.0, score))
        
        # Generate reason
        reasons = []
        if intersection > 0:
            shared_genres = list(main_genres & candidate_genres)[:3]  # Limit to 3 genres
            if shared_genres:
                reasons.append(f"Shares genres: {', '.join(g.title() for g in shared_genres)}")
        
        if overview_similarity > 0.1:
            reasons.append("Similar themes")
            
        if recency_score > 0.5:
            reasons.append("Recent release")
        
        reason = "; ".join(reasons) if reasons else "Similar movie"
        
        return score, reason
        
    except Exception as e:
        print(f"Error in calculate_similarity: {str(e)}\nMain movie: {main_movie}\nCandidate: {candidate_movie}")
        return 0.0, "Error calculating similarity"


@app.get("/api/movies/recommend/<int:movie_id>")
def recommend_movies(movie_id: int):
    try:
        # Get the main movie details
        main_movie, error_response = tmdb_get(
            f"/movie/{movie_id}",
            params={"language": "en-US"},
            soft_fail=False
        )
        if error_response is not None:
            return error_response
        
        # Get popular movies as candidate pool
        candidates, error_response = tmdb_get(
            "/movie/popular",
            params={"language": "en-US", "page": 1, "per_page": 50},
            soft_fail=False,
            retries=2,
        )
        if error_response is not None:
            return error_response
        
        # Calculate similarity scores for each candidate
        scored_movies = []
        for candidate in candidates.get("results", []):
            try:
                # Skip if candidate is missing required fields
                if not candidate or not isinstance(candidate, dict) or "id" not in candidate:
                    continue
                    
                # Skip the movie itself
                if candidate.get("id") == movie_id:
                    continue
                
                candidate_id = candidate["id"]
                
                # Get full details for the candidate movie
                candidate_details, _ = tmdb_get(
                    f"/movie/{candidate_id}",
                    params={"language": "en-US", "append_to_response": "keywords"},
                    soft_fail=True
                )
                
                if not candidate_details or not isinstance(candidate_details, dict):
                    continue
                
                # Ensure we have the required fields
                if "id" not in candidate_details or "title" not in candidate_details:
                    continue
                
                # Calculate similarity score and reason
                score, reason = calculate_similarity(main_movie, candidate_details)
                
                # Add to results with additional metadata
                scored_movies.append({
                    "id": candidate_details["id"],
                    "title": candidate_details["title"],
                    "poster_path": candidate_details.get("poster_path"),
                    "backdrop_path": candidate_details.get("backdrop_path"),
                    "release_date": candidate_details.get("release_date", ""),
                    "vote_average": float(candidate_details.get("vote_average", 0)),
                    "overview": candidate_details.get("overview", ""),
                    "genres": [g["name"] for g in candidate_details.get("genres", []) if isinstance(g, dict) and "name" in g],
                    "similarity_score": float(score),
                    "reason": reason
                })
                
            except Exception as e:
                print(f"Error processing candidate movie {candidate.get('id')}: {str(e)}")
                continue
        
        # Sort by similarity score (descending) and take top 8
        recommended = sorted(
            scored_movies,
            key=lambda x: x.get("similarity_score", 0),
            reverse=True
        )[:8]
        
        return jsonify({
            "results": recommended,
            "original_movie": {
                "id": main_movie.get("id"),
                "title": main_movie.get("title"),
                "genres": [g["name"] for g in main_movie.get("genres", []) if isinstance(g, dict) and "name" in g]
            }
        })
        
    except Exception as e:
        print(f"Error in recommend_movies: {str(e)}")
        return jsonify({
            "error": "Failed to generate recommendations",
            "details": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="localhost", port=5000, debug=True)
