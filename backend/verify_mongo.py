import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')

try:
    client = MongoClient(MONGO_URI)
    db = client['dorae_db']
    collection = db['user_inputs']
    
    # Check for the test input
    doc = collection.find_one({"word": "Refactor Test"})
    
    if doc:
        print("Success: Found 'Refactor Test' in MongoDB!")
    else:
        print("Failure: 'Refactor Test' not found in MongoDB.")
        
except Exception as e:
    print(f"Error: {e}")
