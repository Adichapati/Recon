import os

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)

app = Flask(__name__)
CORS(app)


def tmdb_get(path: str, *, params=None):
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

    try:
        response = requests.get(url, params=query_params, headers=headers, timeout=10)
    except requests.RequestException:
        # In dev mode, Next.js can trigger duplicate / cancelled requests (e.g. Strict Mode).
        # Treat transient upstream failures as non-fatal.
        return (
            {"results": [], "warning": "TMDB request failed or was interrupted"},
            None,
        )

    try:
        payload = response.json()
    except ValueError:
        return (
            {"results": [], "warning": "TMDB returned an invalid response"},
            None,
        )

    if not response.ok:
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


@app.get("/api/movies/search")
def search_movies():
    query = request.args.get("query", "")
    if not query or not query.strip():
        return jsonify({"results": []})

    payload, error_response = tmdb_get(
        "/search/movie",
        params={
            "query": query,
            "language": "en-US",
            "page": 1,
            "include_adult": False,
        },
    )
    if error_response is not None:
        return error_response

    return jsonify(payload)


if __name__ == "__main__":
    app.run(host="localhost", port=5000, debug=True)
