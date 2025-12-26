import os
from typing import Optional
from datetime import datetime

import requests
from flask import Flask, jsonify, request, redirect, session, url_for
from flask_cors import CORS
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth
from datetime import datetime, timedelta

# ------------------------------------------------------------------
# ENV SETUP
# ------------------------------------------------------------------
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)

# ------------------------------------------------------------------
# APP SETUP
# ------------------------------------------------------------------
app = Flask(__name__)
app.secret_key = "dev-secret-key"

app.config.update(
    SESSION_COOKIE_NAME="session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,  # MUST be False for localhost
)
@app.post("/debug-session")
def debug_session():
    session["test"] = "works"
    session.modified = True
    return jsonify({"session": dict(session)})


@app.route("/debug")
def debug():
    return "DEBUG ROUTE WORKS"

app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key")
from flask_cors import CORS

CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:3000"],
)

#Time code session for guest login
GUEST_SESSION_TTL = timedelta(hours=2)

# ------------------------------------------------------------------
# GOOGLE OAUTH SETUP
# ------------------------------------------------------------------
oauth = OAuth(app)

google = oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


# ------------------------------------------------------------------
# BASIC ROUTES
# ------------------------------------------------------------------
@app.route("/")
def home():
    return "Backend is running 🚀"
@app.post("/guest-login")
def guest_login():
    session["user"] = {
        "id": f"guest-{os.urandom(4).hex()}",
        "name": "Guest User",
        "email": None,
        "picture": None,
        "role": "guest",
    }

    session.modified = True  # IMPORTANT

    return jsonify({"ok": True})



@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})

# ------------------------------------------------------------------
# AUTH ROUTES
# ------------------------------------------------------------------
@app.get("/login")
def login():
    redirect_uri = url_for("auth_callback", _external=True)
    return google.authorize_redirect(redirect_uri)

@app.get("/auth/callback")
def auth_callback():
    token = google.authorize_access_token()
    user_info = token.get("userinfo") or google.userinfo()

    # 🔄 Upgrade guest → Google user
    session["user"] = {
        "id": user_info.get("sub"),
        "email": user_info.get("email"),
        "name": user_info.get("name"),
        "picture": user_info.get("picture"),
        "role": "user",
    }

    return redirect("http://localhost:3000")





@app.get("/me")
def me():
    user = session.get("user")
    if not user:
        return jsonify({"authenticated": False}), 401

    # ⏱️ Expire guest sessions
    if user.get("role") == "guest":
        created = datetime.fromisoformat(user["created_at"])
        if datetime.utcnow() - created > GUEST_SESSION_TTL:
            session.clear()
            return jsonify({"authenticated": False}), 401

    return jsonify({
        "authenticated": True,
        "user": user
    })


@app.get("/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

# ------------------------------------------------------------------
# TMDB HELPERS
# ------------------------------------------------------------------
def tmdb_get(path: str, *, params=None, soft_fail: bool = True):
    api_key = os.getenv("TMDB_API_KEY")
    if not api_key:
        return None, (jsonify({"error": "TMDB_API_KEY not set"}), 500)

    base_url = "https://api.themoviedb.org/3"
    url = f"{base_url}{path}"

    headers = {}
    query_params = dict(params or {})

    if api_key.lower().startswith("bearer "):
        headers["Authorization"] = api_key
    else:
        query_params["api_key"] = api_key

    try:
        response = requests.get(url, params=query_params, headers=headers, timeout=10)
        payload = response.json()
    except Exception:
        if soft_fail:
            return {"results": []}, None
        return None, (jsonify({"error": "TMDB request failed"}), 500)

    if not response.ok:
        if soft_fail:
            return {"results": []}, None
        return None, (jsonify({"error": "TMDB error"}), response.status_code)

    return payload, None

# ------------------------------------------------------------------
# MOVIE ROUTES (UNCHANGED LOGIC)
# ------------------------------------------------------------------
@app.get("/api/movies/popular")
def popular_movies():
    payload, error = tmdb_get("/movie/popular", params={"language": "en-US"})
    if error:
        return error
    return jsonify(payload)

@app.get("/api/movies/trending")
def trending_movies():
    payload, error = tmdb_get("/trending/movie/week", params={"language": "en-US"})
    if error:
        return error
    return jsonify(payload)

@app.get("/api/movies/<movie_id>")
def movie_details(movie_id: str):
    if not movie_id.isdigit():
        return jsonify({"error": "Invalid movie ID"}), 400

    payload, error = tmdb_get(f"/movie/{movie_id}", params={"language": "en-US"}, soft_fail=False)
    if error:
        return error

    img_base = "https://image.tmdb.org/t/p/w500"
    return jsonify({
        "id": payload.get("id"),
        "title": payload.get("title"),
        "overview": payload.get("overview"),
        "poster_path": f"{img_base}{payload.get('poster_path')}" if payload.get("poster_path") else "",
        "backdrop_path": f"{img_base}{payload.get('backdrop_path')}" if payload.get("backdrop_path") else "",
        "release_date": payload.get("release_date"),
        "vote_average": payload.get("vote_average", 0),
        "genres": [g["name"] for g in payload.get("genres", []) if "name" in g],
    })

@app.get("/api/movies/search")
def search_movies():
    query = request.args.get("query", "")
    if not query.strip():
        return jsonify({"results": []})

    payload, error = tmdb_get(
        "/search/multi",
        params={"query": query, "language": "en-US", "include_adult": "false"},
    )
    if error:
        return error

    return jsonify({
        "results": [
            item for item in payload.get("results", [])
            if item.get("media_type") in ["movie", "tv"] and item.get("poster_path")
        ]
    })

# ------------------------------------------------------------------
# RUN SERVER
# ------------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="localhost", port=5000, debug=True)
