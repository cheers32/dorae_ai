from flask import Flask, request, jsonify
import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId
from datetime import datetime
import uuid

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
from flask_cors import CORS
CORS(app)

@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')

@app.errorhandler(404)
def not_found(e):
    return app.send_static_file('index.html')

MONGO_URI = os.getenv('MONGO_URI')

import certifi

# Initialize MongoDB
try:
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    db = client['dorae_db']
    tasks_collection = db['tasks']
    labels_collection = db['labels']
    folders_collection = db['folders']
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

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Check MongoDB connection
        if client:
            client.admin.command('ping')
            return jsonify({'status': 'healthy', 'db': 'connected'}), 200
        else:
            return jsonify({'status': 'unhealthy', 'db': 'disconnected'}), 503
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'error': str(e)}), 503

@app.route('/api/login', methods=['POST'])
def login_user():
    try:
        user_data = request.json
        if not user_data or 'email' not in user_data:
             return jsonify({'error': 'Invalid user data'}), 400
        
        # Upsert user: Update if exists, Insert if new
        users_collection = db['users']
        result = users_collection.update_one(
            {'email': user_data['email']},
            {'$set': {
                'name': user_data.get('name'),
                'picture': user_data.get('picture'),
                'last_login': datetime.utcnow()
            }},
            upsert=True
        )

        # Log history (Audit Log)
        history_collection = db['login_logs']
        history_collection.insert_one({
            'email': user_data['email'],
            'timestamp': datetime.utcnow(),
            'ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent')
        })
        
        return jsonify({'status': 'success', 'message': 'User saved'}), 200
    except Exception as e:
        print(f"Error saving user: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/traffic', methods=['POST'])
def log_traffic():
    try:
        # Skip localhost
        if request.remote_addr in ['127.0.0.1', '::1']:
           return jsonify({'status': 'skipped', 'message': 'Localhost traffic ignored'}), 200

        data = request.json
        
        traffic_collection = db['traffic_logs']
        traffic_collection.insert_one({
            'path': data.get('path'),
            'user_email': data.get('user_email'), # Optional, if logged in
            'timestamp': datetime.utcnow(),
            'ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent')
        })
        return jsonify({'status': 'logged'}), 200
    except Exception as e:
        print(f"Traffic log error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        status = request.args.get('status')
        label = request.args.get('label')
        query = {}
        
        if status == 'Deleted':
            query['status'] = {'$in': ['Deleted', 'deleted']}
        elif status == 'Active':
            # Exclude completed/closed and deleted/trash
            query['status'] = {'$nin': ['Closed', 'completed', 'Deleted', 'deleted']}
        elif status:
            query['status'] = status
        else:
            # Default: exclude deleted
            query['status'] = {'$nin': ['Deleted', 'deleted']}

        if label:
            query['labels'] = label

        user_email = request.args.get('user_email')
        if user_email:
            query['user_email'] = user_email
        else:
            query['$or'] = [{'user_email': None}, {'user_email': {'$exists': False}}]

        folder_id = request.args.get('folderId')
        if folder_id == 'null':
             query['$or'] = [{'folderId': None}, {'folderId': {'$exists': False}}]
        elif folder_id:
            query['folderId'] = folder_id
        
        # Sort by order ascending, then created_at desc
        tasks = list(tasks_collection.find(query).sort([('order', 1), ('created_at', -1)]))
        return jsonify([serialize_doc(task) for task in tasks]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks/reorder', methods=['PUT'])
def reorder_tasks():
    try:
        data = request.json
        if not data or 'taskIds' not in data:
            return jsonify({"error": "taskIds list is required"}), 400
        
        task_ids = data['taskIds']
        
        # Bulk write for better performance
        from pymongo import UpdateOne
        operations = []
        for index, task_id in enumerate(task_ids):
            operations.append(
                UpdateOne({"_id": ObjectId(task_id)}, {"$set": {"order": index}})
            )
            
        if operations:
            tasks_collection.bulk_write(operations)
            
        return jsonify({"message": "Tasks reordered"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        # Check current status first
        task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        if not task:
            return jsonify({"error": "Task not found"}), 404

        if task.get('status') in ['Deleted', 'deleted']:
             # Hard Delete
            result = tasks_collection.delete_one({"_id": ObjectId(task_id)})
            return jsonify({"message": "Task permanently deleted"}), 200
        else:
            # Soft Delete
            result = tasks_collection.update_one(
                {"_id": ObjectId(task_id)},
                {
                    "$set": {"status": "Deleted", "deleted_at": datetime.utcnow()},
                    "$push": {"updates": {
                        "id": str(uuid.uuid4()),
                        "content": "Task moved to trash",
                        "type": "deletion",
                        "timestamp": datetime.utcnow().isoformat()
                    }}
                }
            )
            return jsonify({"message": "Task moved to trash"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks/trash', methods=['DELETE'])
def empty_trash():
    user_email = request.args.get('user_email')
    query = {"status": {"$in": ["Deleted", "deleted"]}}
    if user_email:
        query["user_email"] = user_email
    else:
        query['$or'] = [{'user_email': None}, {'user_email': {'$exists': False}}]

    try:
        result = tasks_collection.delete_many(query)
        return jsonify({"message": f"Deleted {result.deleted_count} tasks"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        # Aggregation pipeline could be more efficient, but individual counts are simple for now
        
        user_email = request.args.get('user_email')
        base_query = {}
        if user_email:
            base_query['user_email'] = user_email
        else:
            base_query['$or'] = [{'user_email': None}, {'user_email': {'$exists': False}}]
        
        # 1. Active Tasks
        active_query = {
            'status': {'$nin': ['Closed', 'completed', 'Deleted', 'deleted']},
            '$or': [{'folderId': None}, {'folderId': {'$exists': False}}]
        }
        active_query.update(base_query)
        active_count = tasks_collection.count_documents(active_query)
        
        # 2. Closed Tasks
        closed_query = {'status': {'$in': ['Closed', 'completed']}}
        closed_query.update(base_query)
        closed_count = tasks_collection.count_documents(closed_query)
        
        # 3. Trash
        trash_query = {'status': {'$in': ['Deleted', 'deleted']}}
        trash_query.update(base_query)
        trash_count = tasks_collection.count_documents(trash_query)
        
        # 4. Folders
        folder_query = base_query.copy()
        folders = list(folders_collection.find(folder_query))
        folder_counts = {}
        for folder in folders:
            folder_id = str(folder['_id'])
            f_count_query = {
                'status': {'$nin': ['Deleted', 'deleted']},
                'folderId': folder_id
            }
            f_count_query.update(base_query)
            count = tasks_collection.count_documents(f_count_query)
            folder_counts[folder_id] = count
            
        # 5. Labels
        label_query = base_query.copy()
        labels = list(labels_collection.find(label_query))
        label_counts = {}
        for label in labels:
            label_name = label['name']
            l_count_query = {
                'status': {'$nin': ['Deleted', 'deleted']},
                'labels': label_name
            }
            l_count_query.update(base_query)
            count = tasks_collection.count_documents(l_count_query)
            label_counts[label_name] = count
            
        return jsonify({
            'active': active_count,
            'closed': closed_count,
            'trash': trash_count,
            'folders': folder_counts,
            'labels': label_counts
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks/<task_id>/update/<update_id>', methods=['DELETE'])
def delete_task_update(task_id, update_id):
    try:
        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$pull": {"updates": {"id": update_id}}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Task not found"}), 404
            
        return jsonify({"message": "Update item deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    try:
        data = request.json
        update_fields = {}
        update_fields = {}
        allowed_fields = ['title', 'priority', 'category', 'status', 'importance', 'labels', 'folderId']
        
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
                
        # Fetch current task to check status
        current_task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        if not current_task:
             return jsonify({"error": "Task not found"}), 404

        if 'status' in data:
            new_status = data['status']
            if new_status == 'Closed':
                now = datetime.utcnow().isoformat()
                update_fields['completed_at'] = now
            else:
                update_fields['completed_at'] = None
            
            # Add status change event ONLY if status is actually changing
            if current_task.get('status') != new_status:
                tasks_collection.update_one(
                    {"_id": ObjectId(task_id)},
                    {"$push": {"updates": {
                        "id": str(uuid.uuid4()),
                        "content": f"Task status changed to {new_status}",
                        "type": "status_change",
                        "timestamp": datetime.utcnow().isoformat()
                    }}}
                )

        # Log other property changes
        for prop in ['priority', 'category']:
            if prop in data:
                 tasks_collection.update_one(
                    {"_id": ObjectId(task_id)},
                    {"$push": {"updates": {
                        "id": str(uuid.uuid4()),
                        "content": f"{prop.capitalize()} changed to {data[prop]}",
                        "type": "property_change",
                        "timestamp": datetime.utcnow().isoformat()
                    }}}
                )

        result = tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Task not found"}), 404
            
        return jsonify(update_fields), 200
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
            "status": "Active",
            "created_at": datetime.utcnow().isoformat(),
            "completed_at": None,
            "priority": "medium", # Default
            "importance": 3,      # Default
            "category": "General", # Default
            "category": "General", # Default
            "labels": data.get('labels', []), # Use provided labels or empty array
            "folderId": data.get('folderId'),
            "user_email": data.get('user_email'), # Associate with user
            "updates": [{
                "id": str(uuid.uuid4()),
                "content": "Task created",
                "timestamp": datetime.utcnow().isoformat(),
                "type": "creation"
            }],
            "ai_analysis": None,
            "order": 0 # Default to top
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
                    "status": "Closed",
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

        # Add analysis to timeline
        update_item = {
            "id": str(uuid.uuid4()),
            "content": f"AI Plan: {analysis['suggestions']}",
            "type": "ai_analysis",
            "timestamp": datetime.utcnow().isoformat()
        }

        tasks_collection.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "ai_analysis": {
                        "summary": analysis.get('summary'),
                        "suggestions": analysis.get('suggestions')
                    },
                    "priority": analysis.get('priority', task['priority']),
                    "category": analysis.get('category', task['category']),
                    "importance": analysis.get('importance', task['importance'])
                },
                "$push": {"updates": update_item}
            }
        )
        
        return jsonify(analysis), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        message = data.get('message')
        if not message:
            return jsonify({"error": "Message is required"}), 400
            
        # Fetch all tasks for context (RAG-lite)
        # In a real app, you might only fetch active ones or limit the number
        # Fetch all tasks for context (RAG-lite)
        query = {}
        if 'user_email' in data:
            query['user_email'] = data['user_email']
        else:
            query['$or'] = [{'user_email': None}, {'user_email': {'$exists': False}}]
            
        cursor = tasks_collection.find(query).sort('created_at', -1)
        tasks = list(cursor)
        
        # Serialize simply for AI context
        tasks_context = []
        for t in tasks:
            tasks_context.append({
                "title": t.get('title'),
                "status": t.get('status'),
                "priority": t.get('priority'),
                "category": t.get('category')
            })
            
        response_text = ai_service.chat_with_task_context(message, tasks_context)
        
        return jsonify({"reply": response_text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Label Endpoints ---

@app.route('/api/labels', methods=['GET'])
def get_labels():
    try:
        user_email = request.args.get('user_email')
        query = {}
        if user_email:
            query['user_email'] = user_email
        else:
            query['$or'] = [{'user_email': None}, {'user_email': {'$exists': False}}]
        labels = list(labels_collection.find(query))
        return jsonify([serialize_doc(label) for label in labels]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/labels', methods=['POST'])
def create_label():
    try:
        data = request.json
        if not data or 'name' not in data:
            return jsonify({"error": "Label name is required"}), 400
        
        new_label = {
            "name": data['name'],
            "color": data.get('color', '#3B82F6'), # Default blue
            "user_email": data.get('user_email'),
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = labels_collection.insert_one(new_label)
        new_label['_id'] = result.inserted_id
        return jsonify(serialize_doc(new_label)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/labels/<label_id>', methods=['PUT'])
def update_label(label_id):
    try:
        data = request.json
        update_fields = {}
        
        if 'name' in data:
            update_fields['name'] = data['name']
        if 'color' in data:
            update_fields['color'] = data['color']
            
        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400
        
        result = labels_collection.update_one(
            {"_id": ObjectId(label_id)},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Label not found"}), 404
            
        return jsonify({"message": "Label updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/labels/<label_id>', methods=['DELETE'])
def delete_label(label_id):
    try:
        result = labels_collection.delete_one({"_id": ObjectId(label_id)})
        return jsonify({"message": "Label deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/folders', methods=['GET'])
def get_folders():
    try:
        user_email = request.args.get('user_email')
        query = {}
        if user_email:
            query['user_email'] = user_email
        else:
            query['$or'] = [{'user_email': None}, {'user_email': {'$exists': False}}]
        folders = list(folders_collection.find(query))
        return jsonify([serialize_doc(f) for f in folders]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/folders', methods=['POST'])
def create_folder():
    try:
        data = request.json
        if not data or 'name' not in data:
            return jsonify({"error": "Folder name is required"}), 400
        
        new_folder = {
            "name": data['name'],
            "user_email": data.get('user_email'),
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = folders_collection.insert_one(new_folder)
        new_folder['_id'] = result.inserted_id
        return jsonify(serialize_doc(new_folder)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/folders/<folder_id>', methods=['DELETE'])
def delete_folder(folder_id):
    try:
        result = folders_collection.delete_one({"_id": ObjectId(folder_id)})
        return jsonify({"message": "Folder deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/folders/<folder_id>', methods=['PUT'])
def update_folder(folder_id):
    try:
        data = request.json
        if 'name' not in data:
             return jsonify({"error": "Name is required"}), 400
             
        result = folders_collection.update_one(
            {"_id": ObjectId(folder_id)},
            {"$set": {"name": data['name']}}
        )
        if result.matched_count == 0:
            return jsonify({"error": "Folder not found"}), 404
            
        return jsonify({"message": "Folder updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
