from functools import wraps
from flask import request, jsonify, current_app
import jwt
from datetime import datetime, timedelta

def create_token(user_id, name, email, secret, expires_in_minutes=60*24):
    payload = {
        "sub": str(user_id),
        "name": name,
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=expires_in_minutes)
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def decode_token(token, secret):
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except Exception as e:
        return None

def auth_required(app):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid authorization header"}), 401
            token = auth.split(" ", 1)[1]
            payload = decode_token(token, app.config["JWT_SECRET"])
            if not payload:
                return jsonify({"error": "Invalid or expired token"}), 401
            request.user = {
                "id": payload["sub"],
                "name": payload.get("name"),
                "email": payload.get("email")
            }
            return f(*args, **kwargs)
        return wrapper
    return decorator
