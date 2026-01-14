import uuid
from datetime import datetime
from bson import ObjectId

class TimerSkill:
    def __init__(self, scheduler, ai_service, db):
        self.scheduler = scheduler
        self.ai_service = ai_service
        self.db = db
        self.timers_collection = db['timers']
        self.active_timers = {}
        
        # Restore active timers from DB
        self._restore_timers()

    def _restore_timers(self):
        """Restores timers from MongoDB on startup."""
        try:
            saved_timers = list(self.timers_collection.find())
            print(f"[TimerSkill] Restoring {len(saved_timers)} timers from DB...")
            
            for timer_data in saved_timers:
                job_id = timer_data['job_id']
                agent_id = timer_data['agent_id']
                interval = timer_data['interval']
                instruction = timer_data['instruction']
                task_ids = timer_data['task_ids']
                
                # Check if job already exists in scheduler (unlikely on fresh start, but good safety)
                if self.scheduler.get_job(job_id):
                    print(f"[TimerSkill] Job {job_id} already exists in scheduler.")
                    self.active_timers[job_id] = timer_data
                    continue
                    
                self._schedule_job(job_id, agent_id, interval, instruction, task_ids)
                
                # Update in-memory dict
                self.active_timers[job_id] = {
                    "agent_id": agent_id,
                    "interval": interval,
                    "instruction": instruction,
                    "task_ids": task_ids,
                    "created_at": timer_data.get('created_at')
                }
                print(f"[TimerSkill] Restored timer {job_id} for agent {agent_id}")
                
        except Exception as e:
            print(f"[TimerSkill] Error restoring timers: {e}")

    def _schedule_job(self, job_id, agent_id, interval, instruction, task_ids):
        """Helper to create the closure and add job to scheduler."""
        
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
        self.scheduler.add_job(
            id=job_id,
            func=job_function,
            trigger='interval',
            seconds=int(interval)
        )

    def start_timer(self, agent_id, interval, instruction, task_ids):
        """
        Starts a periodic timer that executes the instruction on the given tasks.
        Persists to MongoDB.
        """
        job_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        
        # 1. Save to MongoDB
        timer_doc = {
            "job_id": job_id,
            "agent_id": agent_id,
            "interval": interval,
            "instruction": instruction,
            "task_ids": task_ids,
            "created_at": created_at
        }
        
        try:
            self.timers_collection.insert_one(timer_doc)
        except Exception as e:
            print(f"[TimerSkill] Error persisting timer: {e}")
            raise e
        
        # 2. Schedule the job
        self._schedule_job(job_id, agent_id, interval, instruction, task_ids)
        
        # 3. Update in-memory
        self.active_timers[job_id] = {
            "agent_id": agent_id,
            "interval": interval,
            "instruction": instruction,
            "task_ids": task_ids,
            "created_at": created_at
        }
        
        return job_id

    def stop_timer(self, job_id):
        stopped = False
        
        # 1. Remove from Scheduler
        try:
            self.scheduler.remove_job(job_id)
            stopped = True
        except Exception as e:
            print(f"Error removing job {job_id} from scheduler: {e}")
            # If job not found in scheduler, we still proceed to clean DB
            if "Job lookup error" in str(e):
                stopped = True # Consider it stopped since it's not running
            
        # 2. Remove from MongoDB
        try:
            self.timers_collection.delete_one({"job_id": job_id})
        except Exception as e:
            print(f"Error removing job {job_id} from DB: {e}")
            
        # 3. Remove from Memory
        if job_id in self.active_timers:
            del self.active_timers[job_id]
            
        return stopped

    def get_agent_timers(self, agent_id):
        return {k: v for k, v in self.active_timers.items() if v['agent_id'] == agent_id}
