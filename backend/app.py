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
from flask_apscheduler import APScheduler
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
    agents_collection = db['agents']
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
            # Exclude completed/closed and deleted/trash/archived
            query['status'] = {'$nin': ['Closed', 'completed', 'Deleted', 'deleted', 'Archived', 'archived']}
        elif status:
            query['status'] = status
        else:
            # Default: exclude deleted and archived
            query['status'] = {'$nin': ['Deleted', 'deleted', 'Archived', 'archived']}

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
            # Soft Delete (Archived) - keep data but hide from trash
            result = tasks_collection.update_one(
                {"_id": ObjectId(task_id)},
                {
                    "$set": {"status": "Archived", "archived_at": datetime.utcnow()},
                    "$push": {"updates": {
                        "id": str(uuid.uuid4()),
                        "content": "Task permanently removed from trash (soft deleted)",
                        "type": "archive",
                        "timestamp": datetime.utcnow().isoformat()
                    }}
                }
            )
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
        # Soft Delete (Archive) all trash items
        result = tasks_collection.update_many(
            query,
            {
                "$set": {"status": "Archived", "archived_at": datetime.utcnow()},
                "$push": {"updates": {
                    "id": str(uuid.uuid4()),
                    "content": "Task permanently removed from trash (soft deleted)",
                    "type": "archive",
                    "timestamp": datetime.utcnow().isoformat()
                }}
            }
        )
        return jsonify({"message": f"Archived {result.modified_count} tasks"}), 200
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
            'status': {'$nin': ['Closed', 'completed', 'Deleted', 'deleted', 'Archived', 'archived']},
            '$or': [{'folderId': None}, {'folderId': {'$exists': False}}]
        }
        active_query.update(base_query)
        active_count = tasks_collection.count_documents(active_query)

        # 1b. All Tasks (Active + Closed) - Exclude Archived
        all_query = {
            'status': {'$nin': ['Deleted', 'deleted', 'Archived', 'archived']}
        }
        all_query.update(base_query)
        all_active_count = tasks_collection.count_documents(all_query)
        
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
                'status': {'$nin': ['Deleted', 'deleted', 'Archived', 'archived']},
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
                'status': {'$nin': ['Deleted', 'deleted', 'Archived', 'archived']},
                'labels': label_name
            }
            l_count_query.update(base_query)
            count = tasks_collection.count_documents(l_count_query)
            label_counts[label_name] = count
            
        return jsonify({
            'active': active_count,
            'all': all_active_count,
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

@app.route('/api/tasks/<task_id>', methods=['GET'])
def get_task(task_id):
    try:
        task = tasks_collection.find_one({"_id": ObjectId(task_id)})
        if not task:
            return jsonify({"error": "Task not found"}), 404
        return jsonify(serialize_doc(task)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    try:
        data = request.json
        update_fields = {}
        update_fields = {}
        allowed_fields = ['title', 'priority', 'category', 'status', 'importance', 'labels', 'folderId', 'attachments', 'assigned_agent_id']
        
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
            "updated_at": datetime.utcnow().isoformat(), # New field
            "completed_at": None,
            "priority": "medium", # Default
            "importance": 3,      # Default
            "category": "General", # Default
            "labels": data.get('labels', []), # Use provided labels or empty array
            "folderId": data.get('folderId'),
            "assigned_agent_id": None, # [NEW]
            "user_email": data.get('user_email'), # Associate with user
            "updates": [{ # Initial update for task creation
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
# ... existing imports
# ... existing imports
from ai_service import AIService
from skills import TimerSkill

# ... existing code

# Initialize AI Service
# Initialize AI Service
ai_service = AIService()

# Initialize Scheduler
scheduler = APScheduler()
scheduler.init_app(app)

# Only start scheduler in the reloader child process or if not in debug mode
if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
    scheduler.start()

# Initialize Skills
timer_skill = TimerSkill(scheduler, ai_service, db)

# ... existing endpoints

@app.route('/api/tasks/<task_id>/analyze', methods=['POST'])
# ... (existing code handles this, but I need to make sure I don't break the file structure)
# I will only touch the Skill Endpoints part in a separate ReplaceChunk if I could, but replace_file_content is single block.
# Wait, the instruction says 500-ish for init and 864-ish for routes. I should use multi_replace.


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
        agent_id = data.get('agent_id')  # Optional: filter tasks by agent
        
        if not message:
            return jsonify({"error": "Message is required"}), 400
            
        # Fetch tasks for context (RAG-lite)
        query = {}
        if 'user_email' in data:
            query['user_email'] = data['user_email']
        else:
            query['$or'] = [{'user_email': None}, {'user_email': {'$exists': False}}]
        
        # If agent_id is provided, only fetch tasks assigned to this agent
        if agent_id:
            query['assigned_agent_id'] = agent_id
            
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
            
        # Fetch Agent Context if agent_id is provided
        agent_context = None
        if agent_id:
            agent = agents_collection.find_one({"_id": ObjectId(agent_id)})
            if agent:
                agent_context = {
                    "name": agent.get('name'),
                    "role": agent.get('role'),
                    "description": agent.get('description'),
                    "notes": agent.get('notes', [])
                }

        response_text = ai_service.chat_with_task_context(message, tasks_context, agent_context)
        
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
        
        # Sort by order (asc) then created_at (desc)
        labels = list(labels_collection.find(query).sort([('order', 1), ('created_at', -1)]))
        return jsonify([serialize_doc(label) for label in labels]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/labels', methods=['POST'])
def create_label():
    try:
        data = request.json
        if not data or 'name' not in data:
            return jsonify({"error": "Label name is required"}), 400
        
        # Get count for default order
        count = labels_collection.count_documents({})

        new_label = {
            "name": data['name'],
            "color": data.get('color', '#3B82F6'), # Default blue
            "user_email": data.get('user_email'),
            "created_at": datetime.utcnow().isoformat(),
            "order": count  # Add to end
        }
        
        result = labels_collection.insert_one(new_label)
        new_label['_id'] = result.inserted_id
        return jsonify(serialize_doc(new_label)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/labels/reorder', methods=['PUT'])
def reorder_labels():
    try:
        data = request.json
        if not data or 'labelIds' not in data:
            return jsonify({"error": "labelIds list is required"}), 400
        
        label_ids = data['labelIds']
        
        from pymongo import UpdateOne
        operations = []
        for index, label_id in enumerate(label_ids):
            operations.append(
                UpdateOne({"_id": ObjectId(label_id)}, {"$set": {"order": index}})
            )
            
        if operations:
            labels_collection.bulk_write(operations)
            
        return jsonify({"message": "Labels reordered"}), 200
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
            
        # Sort by order (asc) then created_at (desc)
        folders = list(folders_collection.find(query).sort([('order', 1), ('created_at', -1)]))
        return jsonify([serialize_doc(f) for f in folders]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/folders', methods=['POST'])
def create_folder():
    try:
        data = request.json
        if not data or 'name' not in data:
            return jsonify({"error": "Folder name is required"}), 400
        
        # Get count for default order
        count = folders_collection.count_documents({})

        new_folder = {
            "name": data['name'],
            "user_email": data.get('user_email'),
            "created_at": datetime.utcnow().isoformat(),
            "order": count # Add default order
        }
        
        result = folders_collection.insert_one(new_folder)
        new_folder['_id'] = result.inserted_id
        return jsonify(serialize_doc(new_folder)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/folders/reorder', methods=['PUT'])
def reorder_folders():
    try:
        data = request.json
        if not data or 'folderIds' not in data:
            return jsonify({"error": "folderIds list is required"}), 400
        
        folder_ids = data['folderIds']
        
        from pymongo import UpdateOne
        operations = []
        for index, folder_id in enumerate(folder_ids):
            operations.append(
                UpdateOne({"_id": ObjectId(folder_id)}, {"$set": {"order": index}})
            )
            
        if operations:
            folders_collection.bulk_write(operations)
            
        return jsonify({"message": "Folders reordered"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/folders/<folder_id>', methods=['DELETE'])
def delete_folder(folder_id):
    try:
        # Check if folder has items
        count = tasks_collection.count_documents({
            'folderId': folder_id,
            'status': {'$nin': ['Deleted', 'deleted']}
        })
        
        if count > 0:
            return jsonify({"error": "Cannot delete folder with active tasks"}), 400

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

# --- Agent Endpoints ---

@app.route('/api/agents', methods=['GET'])
def get_agents():
    try:
        user_email = request.args.get('user_email')
        query = {}
        if user_email:
            query['user_email'] = user_email
        else:
            query['$or'] = [{'user_email': None}, {'user_email': {'$exists': False}}]
            
        # Sort by created_at (desc)
        # Sort by created_at (desc)
        agents = list(agents_collection.find(query).sort('created_at', -1))
        
        # [NEW] Attach active tasks to each agent
        for agent in agents:
            # Find Active tasks assigned to this agent
            agent_id = str(agent['_id'])
            # assigned_agent_id should be string in task
            tasks = list(tasks_collection.find({
                'assigned_agent_id': agent_id,
                'status': {'$nin': ['Closed', 'completed', 'Deleted', 'deleted']}
            }, {'title': 1, 'status': 1, 'labels': 1}))
            agent['active_tasks'] = [serialize_doc(t) for t in tasks]

        return jsonify([serialize_doc(a) for a in agents]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/agents', methods=['POST'])
def create_agent():
    try:
        data = request.json
        if not data or 'name' not in data:
            return jsonify({"error": "Agent name is required"}), 400
        
        new_agent = {
            "name": data['name'],
            "description": data.get('description', ''),
            "role": data.get('role', 'Assistant'),
            "user_email": data.get('user_email'),
            "created_at": datetime.utcnow().isoformat(),
            "skills": data.get('skills', []), # Placeholder for skills
            "status": "idle", # idle, busy, focused
            "notes": [] # [NEW] Initialize empty notes
        }
        
        result = agents_collection.insert_one(new_agent)
        new_agent['_id'] = result.inserted_id
        return jsonify(serialize_doc(new_agent)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/agents/<agent_id>', methods=['PUT'])
def update_agent(agent_id):
    try:
        data = request.json
        update_fields = {}
        
        allowed_fields = ['name', 'description', 'role', 'skills', 'status']
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
            
        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400
        
        result = agents_collection.update_one(
            {"_id": ObjectId(agent_id)},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Agent not found"}), 404
            
        return jsonify({"message": "Agent updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/agents/<agent_id>', methods=['DELETE'])
def delete_agent(agent_id):
    try:
        result = agents_collection.delete_one({"_id": ObjectId(agent_id)})
        return jsonify({"message": "Agent deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/agents/<agent_id>/notes', methods=['POST'])
def add_agent_note(agent_id):
    try:
        data = request.json
        if not data or 'content' not in data:
            return jsonify({"error": "Content is required"}), 400
            
        note_item = {
            "id": str(uuid.uuid4()),
            "content": data['content'],
            "type": "note",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        result = agents_collection.update_one(
            {"_id": ObjectId(agent_id)},
            {"$push": {"notes": note_item}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Agent not found"}), 404
            
        return jsonify(note_item), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/agents/<agent_id>/notes/<note_id>', methods=['DELETE'])
def delete_agent_note(agent_id, note_id):
    try:
        result = agents_collection.update_one(
            {"_id": ObjectId(agent_id)},
            {"$pull": {"notes": {"id": note_id}}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Agent not found"}), 404
            
        return jsonify({"message": "Note deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/agents/<agent_id>/notes/<note_id>', methods=['PUT'])
def update_agent_note(agent_id, note_id):
    try:
        data = request.json
        if not data or 'content' not in data:
            return jsonify({"error": "Content is required"}), 400
            
        result = agents_collection.update_one(
            {"_id": ObjectId(agent_id), "notes.id": note_id},
            {"$set": {"notes.$.content": data['content']}}
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Agent or note not found"}), 404
            
        return jsonify({"message": "Note updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Skill Endpoints ---

@app.route('/api/agents/<agent_id>/skills/timer', methods=['POST'])
def start_timer_skill(agent_id):
    try:
        data = request.json
        # Expect: interval (int), instruction (str), taskIds (list)
        if not data or 'interval' not in data or 'instruction' not in data:
            return jsonify({"error": "interval and instruction are required"}), 400
            
        interval = int(data['interval'])
        instruction = data['instruction']
        task_ids = data.get('taskIds', [])
        
        # If no task IDs provided, maybe try to find active tasks for this agent?
        # For now, require taskIds or defaults to empty (which does nothing but run the timer loop)
        
        job_id = timer_skill.start_timer(agent_id, interval, instruction, task_ids)
        
        return jsonify({
            "message": "Timer started",
            "job_id": job_id,
            "config": {
                "interval": interval,
                "instruction": instruction
            }
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/agents/<agent_id>/skills/timer', methods=['GET'])
def get_active_timers(agent_id):
    try:
        timers = timer_skill.get_agent_timers(agent_id)
        return jsonify(timers), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/agents/<agent_id>/skills/timer/<job_id>', methods=['DELETE'])
def stop_timer_skill(agent_id, job_id):
    try:
        success = timer_skill.stop_timer(job_id)
        if success:
            return jsonify({"message": "Timer stopped"}), 200
        else:
            return jsonify({"error": "Timer job not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001, use_reloader=False)
