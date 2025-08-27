from flask import Blueprint, request, jsonify, current_app
from flask_bcrypt import Bcrypt
from bson.objectid import ObjectId

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
bcrypt = Bcrypt()

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json or {}
    name = data.get('name')
    email = (data.get('email') or '').lower()
    password = data.get('password')

    if not (name and email and password):
        return jsonify({"error":"Name, email and password are required"}), 400

    users = current_app.pymongo.db.users
    if users.find_one({"email": email}):
        return jsonify({"error":"Email already registered"}), 400

    hashed = bcrypt.generate_password_hash(password).decode('utf-8')
    res = users.insert_one({"name": name, "email": email, "password": hashed})
    user = users.find_one({"_id": res.inserted_id})
    token = current_app.utils.create_token(str(res.inserted_id), name, email, current_app.config["JWT_SECRET"])
    return jsonify({"user": {"id": str(res.inserted_id), "name": name, "email": email}, "token": token}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    email = (data.get('email') or '').lower()
    password = data.get('password')

    if not (email and password):
        return jsonify({"error":"Email and password are required"}), 400

    users = current_app.pymongo.db.users
    user = users.find_one({"email": email})
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"error":"Invalid credentials"}), 401

    token = current_app.utils.create_token(str(user["_id"]), user["name"], user["email"], current_app.config["JWT_SECRET"])
    return jsonify({"user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"]}, "token": token})
