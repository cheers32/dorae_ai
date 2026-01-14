import os
import time
import uuid
from datetime import datetime
from pymongo import MongoClient
from skills.timer import TimerSkill
from unittest.mock import MagicMock
import certifi
from dotenv import load_dotenv

load_dotenv()

# Mock Scheduler
class MockScheduler:
    def __init__(self):
        self.jobs = {}

    def add_job(self, id, func, trigger, seconds):
        print(f"[MockScheduler] Added job {id} with interval {seconds}s")
        self.jobs[id] = func

    def remove_job(self, id):
        if id in self.jobs:
            print(f"[MockScheduler] Removed job {id}")
            del self.jobs[id]
        else:
            raise Exception("Job lookup error")

    def get_job(self, id):
        return self.jobs.get(id)

# Mock AI Service
class MockAIService:
    def execute_instruction(self, instruction, context, time):
        print(f"[MockAI] Executing: {instruction}")
        return {"action": "add_update", "content": f"Executed at {time}"}

def verify_persistence():
    mongo_uri = os.getenv('MONGO_URI')
    if not mongo_uri:
        print("Error: MONGO_URI not found in environment")
        return

    client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
    db = client['dorae_db']
    timers_collection = db['timers']
    
    # 0. Cleanup test data
    print("--- Cleaning up previous test timers ---")
    timers_collection.delete_many({"instruction": "TEST_PERSISTENCE"})

    # 1. Initialize Skill (First Run)
    print("\n--- 1. Initializing Skill (First Run) ---")
    scheduler1 = MockScheduler()
    ai_service = MockAIService()
    skill1 = TimerSkill(scheduler1, ai_service, db)
    
    # 2. Start a Timer
    print("\n--- 2. Starting a Timer ---")
    agent_id = str(ObjectId()) if 'ObjectId' in globals() else "test_agent_123"
    job_id = skill1.start_timer(
        agent_id=agent_id, 
        interval=600, 
        instruction="TEST_PERSISTENCE", 
        task_ids=["test_task_1"]
    )
    print(f"Started Timer Job ID: {job_id}")

    # 3. Verify in MongoDB
    print("\n--- 3. Verifying in MongoDB ---")
    saved_timer = timers_collection.find_one({"job_id": job_id})
    if saved_timer:
        print("SUCCESS: Timer found in MongoDB")
    else:
        print("FAILURE: Timer NOT found in MongoDB")
        exit(1)

    # 4. Simulate Restart (Second Run)
    print("\n--- 4. Simulating Restart (Restoration) ---")
    scheduler2 = MockScheduler() # Fresh scheduler, empty
    skill2 = TimerSkill(scheduler2, ai_service, db)
    
    # Verify restoration
    if job_id in skill2.active_timers:
        print("SUCCESS: Timer restored in active_timers")
    else:
        print("FAILURE: Timer NOT restored in active_timers")
        exit(1)
        
    if scheduler2.get_job(job_id):
        print("SUCCESS: Timer added to new scheduler")
    else:
        print("FAILURE: Timer NOT added to new scheduler")
        exit(1)
        
    # 5. Cleanup
    print("\n--- 5. Cleanup ---")
    skill2.stop_timer(job_id)
    saved_timer_post_delete = timers_collection.find_one({"job_id": job_id})
    if not saved_timer_post_delete:
        print("SUCCESS: Timer removed from MongoDB after stop")
    else:
        print("FAILURE: Timer still in MongoDB after stop")
        exit(1)

    print("\nVERIFICATION COMPLETE: ALL CHECKS PASSED")

if __name__ == "__main__":
    verify_persistence()
