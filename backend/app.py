from flask import Flask, request, jsonify
import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId
from datetime import datetime
import uuid

load_dotenv()

app = Flask(__name__)
from flask_cors import CORS
CORS(app)

MONGO_URI = os.getenv('MONGO_URI')

# Initialize MongoDB
try:
    client = MongoClient(MONGO_URI)
    db = client['dorae_db']
    tasks_collection = db['tasks']
    print("Connected to MongoDB")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    client = None
    tasks_collection = None

# Helper to serialize MongoDB objects
def serialize_doc(doc):
    if not doc:
        return None
    doc['_id'] = str(doc['_id'])
    return doc

@app.route('/')
def hello():
    return "Dorae AI Backend Running"

# --- Tasks Endpoints ---

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        status = request.args.get('status')
        query = {}
        if status:
            query['status'] = status
        
        # Sort by created_at desc by default
        tasks = list(tasks_collection.find(query).sort('created_at', -1))
        return jsonify([serialize_doc(task) for task in tasks]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks', methods=['POST'])
def create_task():
    try:
        data = request.json
        if not data or 'title' not in data:
            return jsonify({"error": "Title is required"}), 400
        
        new_task = {
            "title": data['title'],
            "status": "pending",
            "created_at": datetime.utcnow().isoformat(),
            "completed_at": None,
            "priority": "medium", # Default
            "importance": 3,      # Default
            "category": "General", # Default
            "updates": [],
            "ai_analysis": None
        }
        
        result = tasks_collection.insert_one(new_task)
        new_task['_id'] = result.inserted_id
        return jsonify(serialize_doc(new_task)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks/<task_id>/update', methods=['POST'])
def add_task_update(task_id):
    try:
        data = request.json
        if not data or 'content' not in data:
            return jsonify({"error": "Content is required"}), 400
            
        update_item = {
            "id": str(uuid.uuid4()),
            "content": data['content'],
            "type": data.get('type', 'detail'), # detail, execution, note
            "timestamp": datetime.utcnow().isoformat(),
            "last_edited_at": None
        }
        
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$push": {"updates": update_item}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Task not found"}), 404
            
        return jsonify(update_item), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks/<task_id>/update/<update_id>', methods=['PUT'])
def edit_task_update(task_id, update_id):
    try:
        data = request.json
        if not data or 'content' not in data:
            return jsonify({"error": "Content is required"}), 400

        # We use array filters to update the specific item in the array
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id), "updates.id": update_id},
            {
                "$set": {
                    "updates.$.content": data['content'],
                    "updates.$.last_edited_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Task or update item not found"}), 404
            
        return jsonify({"message": "Update item modified"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks/<task_id>/close', methods=['POST'])
def close_task(task_id):
    try:
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow().isoformat()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Task not found"}), 404
            
        return jsonify({"message": "Task closed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ... existing imports
from ai_service import AIService

# ... existing code

# Initialize AI Service
ai_service = AIService()

# ... existing endpoints

@app.route('/api/tasks/<task_id>/analyze', methods=['POST'])
def analyze_task(task_id):
    try:
        task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        if not task:
            return jsonify({"error": "Task not found"}), 404
            
        analysis = ai_service.analyze_task(task['title'], task.get('updates', []))
        
        if not analysis:
            return jsonify({"error": "AI analysis failed"}), 500
            
        # Update task with analysis results
        update_fields = {
            "ai_analysis": {
                "summary": analysis.get('summary'),
                "suggestions": analysis.get('suggestions')
            },
            "priority": analysis.get('priority', task['priority']),
            "category": analysis.get('category', task['category']),
            "importance": analysis.get('importance', task['importance'])
        }
        
        tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_fields}
        )
        
        return jsonify(update_fields), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
