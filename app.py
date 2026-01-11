from flask import Flask, request, jsonify
import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
from flask_cors import CORS
CORS(app)

DATA_FILE = 'data.json'
MONGO_URI = os.getenv('MONGO_URI')

# Initialize MongoDB
try:
    client = MongoClient(MONGO_URI)
    db = client['dorae_db']
    collection = db['user_inputs']
    print("Connected to MongoDB")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    client = None
    collection = None

@app.route('/')
def hello():
    return "Hello, World!"

@app.route('/api/save', methods=['POST'])
def save_data():
    try:
        content = request.json
        if not content or 'word' not in content:
            return jsonify({"error": "No word provided"}), 400
        
        word = content['word']
        
        # 1. Save to local file
        data = []
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    data = []
        
        data.append(word)
        
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=4)
            
        # 2. Save to MongoDB
        if collection is not None:
            try:
                collection.insert_one({"word": word})
            except Exception as e:
                print(f"Failed to save to MongoDB: {e}")
                # We typically don't fail the request if just the DB save fails, 
                # but it depends on requirements. For now, we log it.
            
        return jsonify({"message": "Word saved successfully", "word": word}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
