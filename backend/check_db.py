
from pymongo import MongoClient
from bson import ObjectId

client = MongoClient('mongodb://localhost:27017/')
db = client['dorae_v2']
tasks = db['tasks']
labels = db['labels']

# Check Labels
print("Labels:")
for l in labels.find({"name": {"$in": ["Important", "Notable"]}}):
    print(f"- {l['name']}: {l.get('color')}")

# Check Task
task_id = "696a63e79302460006387e1b"
try:
    task = tasks.find_one({"_id": ObjectId(task_id)})
    if task:
        print(f"\nTask: {task.get('title')}")
        print(f"Labels: {task.get('labels')}")
    else:
        print("\nTask not found")
except:
    print("Invalid Task ID format")
