import uuid
from datetime import datetime
from bson import ObjectId

class TimerSkill:
    def __init__(self, scheduler, ai_service, db):
        self.scheduler = scheduler
        self.ai_service = ai_service
        self.db = db
        self.active_timers = {}

    def start_timer(self, agent_id, interval, instruction, task_ids):
        """
        Starts a periodic timer that executes the instruction on the given tasks.
        """
        job_id = str(uuid.uuid4())
        
        # We define the function to run. 
        # Note: In a production environment with persistent job stores, 
        # this function must be importable (not a closure). 
        # For this in-memory implementation, a closure is fine.
        def job_function():
            print(f"[TimerSkill] Executing Job {job_id} for Agent {agent_id}")
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Using the db reference captured from self.db
            tasks_collection = self.db['tasks']
            
            for task_id in task_ids:
                try:
                    task = tasks_collection.find_one({"_id": ObjectId(task_id)})
                    if not task:
                        print(f"Task {task_id} not found, skipping.")
                        continue
                        
                    # Prepare context for AI
                    task_context = {
                        "title": task.get('title'),
                        "status": task.get('status'),
                        "last_update": task.get('updates')[-1]['content'] if task.get('updates') else "None"
                    }
                    
                    # Execute Instruction via AI
                    # We pass the current time as part of the context since the CUJ specifically asks for it
                    result = self.ai_service.execute_instruction(instruction, task_context, current_time)
                    
                    if result and result.get('action') == 'add_update':
                        content = result.get('content')
                        
                        # Apply update to DB
                        update_item = {
                            "id": str(uuid.uuid4()),
                            "content": content,
                            "type": "timer_execution",
                            "timestamp": datetime.utcnow().isoformat(),
                            "agent_id": agent_id,
                            "skill": "timer"
                        }
                        
                        tasks_collection.update_one(
                            {"_id": ObjectId(task_id)},
                            {"$push": {"updates": update_item}}
                        )
                        print(f"[TimerSkill] Added update to task {task_id}: {content}")
                    else:
                        print(f"[TimerSkill] No action or invalid result: {result}")
                        
                except Exception as e:
                    print(f"[TimerSkill] Error processing task {task_id}: {e}")

        # Add job to scheduler
        # We use the 'interval' trigger
        self.scheduler.add_job(
            id=job_id,
            func=job_function,
            trigger='interval',
            seconds=int(interval)
        )
        
        self.active_timers[job_id] = {
            "agent_id": agent_id,
            "interval": interval,
            "instruction": instruction,
            "task_ids": task_ids,
            "created_at": datetime.utcnow().isoformat()
        }
        
        return job_id

    def stop_timer(self, job_id):
        if job_id in self.active_timers:
            try:
                self.scheduler.remove_job(job_id)
            except Exception as e:
                print(f"Error removing job {job_id}: {e}")
                # We continue to remove from dictionary even if scheduler fails (e.g. job already gone)
            
            del self.active_timers[job_id]
            return True
        return False

    def get_agent_timers(self, agent_id):
        return {k: v for k, v in self.active_timers.items() if v['agent_id'] == agent_id}
