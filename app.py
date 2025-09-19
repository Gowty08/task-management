from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import uuid
import datetime

app = Flask(__name__)
CORS(app)  # allow frontend requests from browser

# ---------------- In-Memory Database ----------------
db = {
    "users": [
        {"id": "1", "name": "Demo User", "email": "demo@task.app", "password": "demo"}
    ],
    "projects": [
        {
            "id": "p1",
            "name": "Website Revamp",
            "description": "New marketing site",
            "owner": "1",
            "members": ["1"],
            "createdAt": str(datetime.datetime.now()),
            "updatedAt": str(datetime.datetime.now())
        }
    ],
    "tasks": [
        {
            "id": "t1",
            "projectId": "p1",
            "title": "Landing hero",
            "description": "Landing page design",
            "category": "Frontend",
            "priority": "medium",
            "status": "backlog",
            "dueDate": "2025-09-25",
            "progress": 10,
            "assignees": ["1"],
            "createdBy": "1",
            "createdAt": str(datetime.datetime.now()),
            "updatedAt": str(datetime.datetime.now())
        }
    ],
    "session": None
}

# ---------------- Helper Functions ----------------
def generate_id():
    return str(uuid.uuid4())[:8]

def current_time():
    return str(datetime.datetime.now())

# ---------------- Routes ----------------

@app.route("/")
def index():
    return render_template("index.html")

# ---------- Auth Routes ----------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = next((u for u in db["users"] if u["email"] == email and u["password"] == password), None)
    if user:
        db["session"] = {"userId": user["id"]}
        return jsonify({"success": True, "user": user})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    user = {
        "id": generate_id(),
        "name": data["name"],
        "email": data["email"],
        "password": data["password"]
    }
    if any(u["email"] == user["email"] for u in db["users"]):
        return jsonify({"success": False, "message": "Email already registered"}), 400
    db["users"].append(user)
    db["session"] = {"userId": user["id"]}
    return jsonify({"success": True, "user": user})


@app.route("/api/logout", methods=["POST"])
def logout():
    db["session"] = None
    return jsonify({"success": True})


@app.route("/api/me", methods=["GET"])
def me():
    if db["session"]:
        user = next((u for u in db["users"] if u["id"] == db["session"]["userId"]), None)
        return jsonify(user)
    return jsonify(None)

# ---------- Project Routes ----------
@app.route("/api/projects", methods=["GET"])
def get_projects():
    user_id = db["session"]["userId"]
    projects = [p for p in db["projects"] if p["owner"] == user_id or user_id in p["members"]]
    return jsonify(projects)


@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.get_json()
    user_id = db["session"]["userId"]
    project = {
        "id": generate_id(),
        "name": data["name"],
        "description": data.get("description", ""),
        "owner": user_id,
        "members": [user_id],
        "createdAt": current_time(),
        "updatedAt": current_time()
    }
    db["projects"].append(project)
    return jsonify(project)


@app.route("/api/projects/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    db["projects"] = [p for p in db["projects"] if p["id"] != project_id]
    db["tasks"] = [t for t in db["tasks"] if t["projectId"] != project_id]
    return jsonify({"success": True})

# ---------- Task Routes ----------
@app.route("/api/tasks/<project_id>", methods=["GET"])
def get_tasks(project_id):
    tasks = [t for t in db["tasks"] if t["projectId"] == project_id]
    return jsonify(tasks)


@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.get_json()
    task = {
        "id": generate_id(),
        "projectId": data["projectId"],
        "title": data["title"],
        "description": data.get("description", ""),
        "category": data.get("category", "General"),
        "priority": data.get("priority", "medium"),
        "status": data.get("status", "backlog"),
        "dueDate": data.get("dueDate", ""),
        "progress": data.get("progress", 0),
        "assignees": data.get("assignees", []),
        "createdBy": db["session"]["userId"],
        "createdAt": current_time(),
        "updatedAt": current_time()
    }
    db["tasks"].append(task)
    return jsonify(task)


@app.route("/api/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):
    data = request.get_json()
    task = next((t for t in db["tasks"] if t["id"] == task_id), None)
    if task:
        task.update(data)
        task["updatedAt"] = current_time()
        return jsonify(task)
    return jsonify({"success": False, "message": "Task not found"}), 404


@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    db["tasks"] = [t for t in db["tasks"] if t["id"] != task_id]
    return jsonify({"success": True})

# ---------- Run Server ----------
if __name__ == "__main__":
    app.run(debug=True)
