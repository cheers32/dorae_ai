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
    doc = collection.find_one({"word": "Mongo Test 456"})
    
    if doc:
        print("Success: Found 'Mongo Test 456' in MongoDB!")
    else:
        print("Failure: 'Mongo Test 456' not found in MongoDB.")
        
except Exception as e:
    print(f"Error: {e}")
