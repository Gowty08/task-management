from bson.objectid import ObjectId

def user_doc(user):
    return {
        "_id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"]
    }

def task_doc(task):
    return {
        "id": str(task["_id"]),
        "title": task["title"],
        "description": task.get("description", ""),
        "category": task.get("category", ""),
        "priority": task.get("priority", "low"),
        "dueDate": task.get("dueDate"),
        "status": task.get("status", "todo"),
        "createdAt": task.get("createdAt"),
        "userId": str(task["userId"]),
        "assignee": task.get("assignee")
    }
