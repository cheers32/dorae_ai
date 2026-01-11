from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)
from flask_cors import CORS
CORS(app)

DATA_FILE = 'data.json'

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
        
        # Read existing data
        data = []
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r') as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    data = [] # Handle empty or corrupt file
        
        # Append new word
        data.append(word)
        
        # Write back to file
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=4)
            
        return jsonify({"message": "Word saved successfully", "word": word}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
