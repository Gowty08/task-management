from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from bson.objectid import ObjectId

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')
from utils import auth_required

@tasks_bp.route('', methods=['GET'])
@auth_required(current_app)  # will be resolved inside create_app
def get_tasks():
    user_id = request.user["id"]
    db = current_app.pymongo.db
    # return both personal and tasks assigned to the user
    q = {"$or": [{"userId": ObjectId(user_id)}, {"assigneeId": user_id}]}
    docs = db.tasks.find(q).sort("createdAt", -1)
    tasks = []
    for d in docs:
        tasks.append({
            "id": str(d["_id"]),
            "title": d["title"],
            "description": d.get("description", ""),
            "category": d.get("category", ""),
            "priority": d.get("priority", "low"),
            "dueDate": d.get("dueDate"),
            "status": d.get("status", "todo"),
            "createdAt": d.get("createdAt"),
            "userId": str(d["userId"]),
            "assignee": d.get("assignee")
        })
    return jsonify({"tasks": tasks})


@tasks_bp.route('', methods=['POST'])
@auth_required(current_app)
def create_task():
    data = request.json or {}
    title = data.get("title")
    if not title:
        return jsonify({"error":"Title required"}), 400

    user_id = request.user["id"]
    db = current_app.pymongo.db
    task = {
        "title": title,
        "description": data.get("description"),
        "category": data.get("category"),
        "priority": data.get("priority", "low"),
        "dueDate": data.get("dueDate"),
        "status": "todo",
        "createdAt": datetime.utcnow().isoformat(),
        "userId": ObjectId(user_id),
        "assignee": data.get("assignee"),
        "assigneeId": data.get("assigneeId")
    }
    res = db.tasks.insert_one(task)
    task["id"] = str(res.inserted_id)
    task["userId"] = str(task["userId"])
    return jsonify({"task": task}), 201


@tasks_bp.route('/<task_id>', methods=['PUT', 'PATCH'])
@auth_required(current_app)
def update_task(task_id):
    data = request.json or {}
    user_id = request.user["id"]
    db = current_app.pymongo.db
    task = db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        return jsonify({"error":"Task not found"}), 404
    # Only owner or assignee can update (simple rule)
    if str(task["userId"]) != user_id and task.get("assigneeId") != user_id:
        return jsonify({"error":"Forbidden"}), 403

    updates = {}
    for k in ["title","description","category","priority","dueDate","status","assignee","assigneeId"]:
        if k in data:
            updates[k] = data[k]
    if updates:
        db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": updates})
    updated = db.tasks.find_one({"_id": ObjectId(task_id)})
    updated["id"] = str(updated["_id"])
    updated["userId"] = str(updated["userId"])
    return jsonify({"task": updated})


@tasks_bp.route('/<task_id>', methods=['DELETE'])
@auth_required(current_app)
def delete_task(task_id):
    user_id = request.user["id"]
    db = current_app.pymongo.db
    task = db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        return jsonify({"error":"Task not found"}), 404
    if str(task["userId"]) != user_id:
        return jsonify({"error":"Forbidden"}), 403
    db.tasks.delete_one({"_id": ObjectId(task_id)})
    return jsonify({"result":"deleted"})
