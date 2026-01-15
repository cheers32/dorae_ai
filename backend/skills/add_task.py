import uuid
from datetime import datetime
from bson import ObjectId

class AddTaskSkill:
    """
    Add Task Skill - Enables AI agents to create tasks programmatically.
    
    This skill allows agents to call the task creation API autonomously.
    When an agent has this skill enabled, it can create new tasks with:
    - Title (required)
    - Labels/tags
    - Folder assignment
    - Priority
    - Category
    - Initial updates
    """
    
    def __init__(self, db):
        """
        Initialize the Add Task skill.
        
        Args:
            db: MongoDB database instance
        """
        self.db = db
        self.tasks_collection = db['tasks']
        self.agents_collection = db['agents']
    
    def create_task(self, agent_id, task_data):
        """
        Create a new task on behalf of an agent.
        
        Args:
            agent_id (str): The ID of the agent creating the task
            task_data (dict): Task information including:
                - title (str, required): Task title
                - labels (list, optional): List of label names
                - folderId (str, optional): Folder ID to place task in
                - priority (str, optional): Priority level (low/medium/high)
                - category (str, optional): Task category
                - user_email (str, optional): User email to associate task with
                - initial_update (str, optional): Initial update content
        
        Returns:
            dict: The created task document with _id
            
        Raises:
            ValueError: If title is missing or agent not found
        """
        # Validate inputs
        if not task_data or 'title' not in task_data:
            raise ValueError("Task title is required")
        
        # Verify agent exists
        agent = self.agents_collection.find_one({"_id": ObjectId(agent_id)})
        if not agent:
            raise ValueError(f"Agent {agent_id} not found")
        
        # Build task document
        now = datetime.utcnow()
        
        new_task = {
            "title": task_data['title'],
            "status": "Active",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "completed_at": None,
            "priority": task_data.get('priority', 'medium'),
            "importance": self._priority_to_importance(task_data.get('priority', 'medium')),
            "category": task_data.get('category', 'General'),
            "labels": task_data.get('labels', []),
            "folderId": task_data.get('folderId'),
            "assigned_agent_id": agent_id,  # Assign to the creating agent
            "user_email": task_data.get('user_email'),
            "updates": [],
            "ai_analysis": None,
            "order": 0  # Default to top
        }
        
        # Add creation update
        creation_update = {
            "id": str(uuid.uuid4()),
            "content": f"Task created by agent: {agent.get('name', 'Unknown Agent')}",
            "timestamp": now.isoformat(),
            "type": "creation",
            "agent_id": agent_id,
            "skill": "add_task"
        }
        new_task['updates'].append(creation_update)
        
        # Add optional initial update if provided
        if 'initial_update' in task_data and task_data['initial_update']:
            initial_update = {
                "id": str(uuid.uuid4()),
                "content": task_data['initial_update'],
                "timestamp": now.isoformat(),
                "type": "detail",
                "agent_id": agent_id,
                "skill": "add_task"
            }
            new_task['updates'].append(initial_update)
        
        # Insert into database
        result = self.tasks_collection.insert_one(new_task)
        new_task['_id'] = result.inserted_id
        
        print(f"[AddTaskSkill] Agent {agent_id} created task: {task_data['title']} (ID: {result.inserted_id})")
        
        return new_task
    
    def _priority_to_importance(self, priority):
        """Convert priority string to importance number (1-5)."""
        priority_map = {
            'low': 2,
            'medium': 3,
            'high': 5
        }
        return priority_map.get(priority.lower(), 3)
    
    def get_agent_created_tasks(self, agent_id, limit=10):
        """
        Get tasks created by a specific agent.
        
        Args:
            agent_id (str): The agent's ID
            limit (int): Maximum number of tasks to return
            
        Returns:
            list: List of task documents
        """
        tasks = list(
            self.tasks_collection.find({
                "assigned_agent_id": agent_id,
                "updates.skill": "add_task"
            })
            .sort("created_at", -1)
            .limit(limit)
        )
        return tasks
