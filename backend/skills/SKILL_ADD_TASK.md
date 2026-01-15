---
name: Add Task
description: Enables AI agents to create tasks programmatically via API
version: 1.0.0
author: Dorae AI
category: Productivity
---

# Add Task Skill

## Overview

The **Add Task** skill empowers AI agents to autonomously create new tasks in the Dorae task management system. Once this skill is enabled for an agent, the agent can call the task creation API to add tasks with full customization options including title, labels, priority, category, and folder assignment.

## Features

- ✅ **Autonomous Task Creation**: Agents can create tasks without user intervention
- ✅ **Full Customization**: Support for labels, folders, priority, category, and custom updates
- ✅ **Agent Attribution**: All created tasks are automatically assigned to the creating agent
- ✅ **Audit Trail**: Every task includes metadata showing it was created by the Add Task skill
- ✅ **Activity Tracking**: Query tasks created by specific agents
- ✅ **Statistics Dashboard**: View how many tasks an agent has created

## Use Cases

1. **Automated Task Generation**: Agents can break down large projects into subtasks
2. **Recurring Task Creation**: Combine with Timer skill to create periodic tasks
3. **AI-Driven Task Management**: Let agents suggest and create tasks based on project analysis
4. **Workflow Automation**: Create follow-up tasks based on completion of other tasks
5. **Smart Reminders**: Agents can create reminder tasks for important deadlines

## API Endpoints

### 1. Create Task via Skill

**POST** `/api/agents/<agent_id>/skills/add-task`

Creates a new task on behalf of the specified agent.

#### Request Body

```json
{
  "title": "Task title",                    // Required
  "labels": ["label1", "label2"],           // Optional
  "folderId": "folder_id",                  // Optional
  "priority": "low|medium|high",            // Optional, default: "medium"
  "category": "Category name",              // Optional, default: "General"
  "user_email": "user@example.com",         // Optional
  "initial_update": "Initial task details"  // Optional
}
```

#### Response (201 Created)

```json
{
  "message": "Task created via Add Task skill",
  "task": {
    "_id": "task_id",
    "title": "Task title",
    "status": "Active",
    "created_at": "2026-01-15T16:00:00",
    "assigned_agent_id": "agent_id",
    "priority": "medium",
    "category": "General",
    "labels": ["label1", "label2"],
    "folderId": "folder_id",
    "updates": [
      {
        "id": "update_id",
        "content": "Task created by agent: Agent Name",
        "type": "creation",
        "timestamp": "2026-01-15T16:00:00",
        "agent_id": "agent_id",
        "skill": "add_task"
      }
    ]
  }
}
```

#### Error Responses

- **400 Bad Request**: Missing required `title` field
- **400 Bad Request**: Agent not found
- **500 Internal Server Error**: Database or server error

---

### 2. Get Agent Created Tasks

**GET** `/api/agents/<agent_id>/skills/add-task/tasks?limit=10`

Retrieve tasks created by a specific agent using the Add Task skill.

#### Query Parameters

- `limit` (optional): Maximum number of tasks to return (default: 10)

#### Response (200 OK)

```json
{
  "tasks": [
    {
      "_id": "task_id",
      "title": "Task title",
      "status": "Active",
      "created_at": "2026-01-15T16:00:00",
      "assigned_agent_id": "agent_id",
      // ... other task fields
    }
  ],
  "count": 5
}
```

---

### 3. Check Skill Status

**GET** `/api/agents/<agent_id>/skills/add-task`

Check if the Add Task skill is available for an agent and get statistics.

#### Response (200 OK)

```json
{
  "skill": "add_task",
  "status": "active",
  "agent": {
    "id": "agent_id",
    "name": "Agent Name"
  },
  "statistics": {
    "total_tasks_created": 42,
    "tasks_created_last_24h": 5
  }
}
```

#### Error Responses

- **404 Not Found**: Agent not found
- **500 Internal Server Error**: Database or server error

## Usage Examples

### Example 1: Basic Task Creation

```bash
curl -X POST http://localhost:5001/api/agents/65a8f123abc456def/skills/add-task \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Review quarterly reports",
    "priority": "high",
    "category": "Business"
  }'
```

### Example 2: Task with Labels and Folder

```bash
curl -X POST http://localhost:5001/api/agents/65a8f123abc456def/skills/add-task \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Design new feature mockup",
    "labels": ["design", "urgent"],
    "folderId": "65a8f123abc456xyz",
    "priority": "high",
    "category": "Design",
    "initial_update": "Need to create mockups for the new dashboard feature"
  }'
```

### Example 3: Get Tasks Created by Agent

```bash
curl http://localhost:5001/api/agents/65a8f123abc456def/skills/add-task/tasks?limit=20
```

### Example 4: Check Skill Status

```bash
curl http://localhost:5001/api/agents/65a8f123abc456def/skills/add-task
```

## Frontend Integration

### JavaScript/React Example

```javascript
// Create a task via agent
async function createTaskViaAgent(agentId, taskData) {
  const response = await fetch(`/api/agents/${agentId}/skills/add-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
  
  if (!response.ok) {
    throw new Error('Failed to create task');
  }
  
  return await response.json();
}

// Usage
const newTask = await createTaskViaAgent('agent_123', {
  title: 'Implement user authentication',
  labels: ['backend', 'security'],
  priority: 'high',
  category: 'Development',
  initial_update: 'Set up OAuth2 with Google and GitHub providers'
});

console.log('Created task:', newTask.task._id);
```

### Get Agent's Created Tasks

```javascript
async function getAgentTasks(agentId, limit = 10) {
  const response = await fetch(
    `/api/agents/${agentId}/skills/add-task/tasks?limit=${limit}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  
  return await response.json();
}

// Usage
const { tasks, count } = await getAgentTasks('agent_123', 20);
console.log(`Agent created ${count} tasks`);
```

## Skill Implementation Details

### Python Class: `AddTaskSkill`

Located in `/backend/skills/add_task.py`

#### Key Methods

1. **`create_task(agent_id, task_data)`**
   - Creates a new task with agent attribution
   - Validates required fields
   - Auto-assigns task to the creating agent
   - Returns the created task document

2. **`get_agent_created_tasks(agent_id, limit=10)`**
   - Queries tasks created by a specific agent
   - Returns sorted list (newest first)
   - Filters by `skill: "add_task"` in updates

3. **`_priority_to_importance(priority)`**
   - Converts string priority to numeric importance (1-5)
   - Mapping: low=2, medium=3, high=5

### Database Schema

Tasks created via this skill include these special fields:

```python
{
  "assigned_agent_id": "agent_id",  # The creating agent
  "updates": [
    {
      "id": "uuid",
      "content": "Task created by agent: <name>",
      "type": "creation",
      "timestamp": "ISO-8601",
      "agent_id": "agent_id",
      "skill": "add_task"  # Identifies skill-created tasks
    }
  ]
}
```

## Enabling the Skill for Agents

### Backend Setup

The skill is automatically initialized when the Flask app starts:

```python
# In app.py
from skills import AddTaskSkill

add_task_skill = AddTaskSkill(db)
```

### Adding to Agent's Skills Array

Update an agent to include the skill:

```javascript
// Update agent skills
await fetch(`/api/agents/${agentId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    skills: ['timer', 'add_task']  // Add 'add_task' to skills array
  })
});
```

## Security Considerations

1. **Agent Validation**: All requests validate that the agent exists before creating tasks
2. **User Association**: Tasks can be associated with a user via `user_email`
3. **Attribution**: All created tasks are clearly marked with agent and skill metadata
4. **Audit Trail**: Complete history of task creation is maintained in updates

## Combining with Other Skills

### With Timer Skill

Create periodic tasks automatically:

```javascript
// Set up a timer that creates a weekly task
await fetch(`/api/agents/${agentId}/skills/timer`, {
  method: 'POST',
  body: JSON.stringify({
    interval: 604800,  // 7 days in seconds
    instruction: "Create a weekly review task using the add_task skill"
  })
});
```

### Custom Workflows

Build complex automation by combining multiple skills:

1. **Timer Skill**: Schedule periodic checks
2. **Add Task Skill**: Create tasks based on conditions
3. **AI Analysis**: Analyze existing tasks and create follow-ups

## Troubleshooting

### Common Issues

**Issue**: "Agent not found" error
- **Solution**: Verify the agent_id exists in the database

**Issue**: Tasks not showing up
- **Solution**: Check that `status` is not filtered to exclude "Active" tasks

**Issue**: Missing labels or folders
- **Solution**: Ensure label names and folder IDs are valid and exist

### Debug Mode

Enable debug logging in the skill:

```python
# In add_task.py, the skill prints debug info:
print(f"[AddTaskSkill] Agent {agent_id} created task: {title} (ID: {id})")
```

Check backend logs for these messages.

## Future Enhancements

Potential additions to this skill:

- [ ] Bulk task creation API
- [ ] Template-based task creation
- [ ] Task duplication/cloning
- [ ] Scheduled task creation (create at specific time)
- [ ] Task dependency management (create with prerequisites)
- [ ] AI-powered task suggestion

## Support

For issues or questions:
- Check backend logs: `backend/backend_debug.log`
- Review API responses for error details
- Verify MongoDB connection and collections

## License

Part of the Dorae AI project.
