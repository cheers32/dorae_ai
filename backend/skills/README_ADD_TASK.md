# Add Task AI Skill

## Overview

The **Add Task** skill enables AI agents in the Dorae task management system to autonomously create tasks via API calls. Once an agent has this skill enabled, it can programmatically create tasks with full customization options.

## What Was Created

### 1. Core Skill Implementation
- **File**: `/backend/skills/add_task.py`
- **Class**: `AddTaskSkill`
- **Features**:
  - Create tasks with title, labels, priority, category, folder assignment
  - Automatic agent attribution
  - Audit trail for all created tasks
  - Query tasks created by specific agents
  - Statistics tracking

### 2. API Endpoints

Three new REST API endpoints were added to `/backend/app.py`:

#### Create Task via Skill
```
POST /api/agents/<agent_id>/skills/add-task
```
Creates a new task on behalf of an agent with full customization.

#### Get Agent's Created Tasks
```
GET /api/agents/<agent_id>/skills/add-task/tasks?limit=10
```
Retrieves tasks created by a specific agent.

#### Check Skill Status
```
GET /api/agents/<agent_id>/skills/add-task
```
Returns skill status and statistics (total tasks created, last 24h activity).

### 3. Documentation
- **File**: `/backend/skills/SKILL_ADD_TASK.md`
- Comprehensive documentation with:
  - API specifications
  - Usage examples (curl, JavaScript/React)
  - Frontend integration guide
  - Security considerations
  - Troubleshooting guide

### 4. Test Suite
- **File**: `/backend/test_add_task_skill.py`
- Automated test script that demonstrates:
  - Agent creation
  - Task creation via skill
  - Retrieving agent-created tasks
  - Checking skill status
  - Error handling

## Quick Start

### 1. Test the Skill

Run the test script:
```bash
cd /Users/weiteng/Dev/dorae_ai/backend
python3 test_add_task_skill.py
```

### 2. Use in Your Application

#### Create a task via an agent:
```javascript
const response = await fetch(`/api/agents/${agentId}/skills/add-task`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Implement user authentication',
    labels: ['backend', 'security'],
    priority: 'high',
    category: 'Development',
    initial_update: 'Set up OAuth2 providers'
  })
});

const { task } = await response.json();
console.log('Created task:', task._id);
```

#### Get tasks created by an agent:
```javascript
const response = await fetch(`/api/agents/${agentId}/skills/add-task/tasks?limit=20`);
const { tasks, count } = await response.json();
console.log(`Agent created ${count} tasks`);
```

## How It Works

1. **Agent Attribution**: Every task created via this skill is automatically assigned to the creating agent (`assigned_agent_id`)

2. **Audit Trail**: Tasks include a special update entry marking them as created by the Add Task skill:
   ```json
   {
     "type": "creation",
     "agent_id": "agent_id",
     "skill": "add_task",
     "content": "Task created by agent: Agent Name"
   }
   ```

3. **Flexible Parameters**: Support for:
   - Required: `title`
   - Optional: `labels`, `folderId`, `priority`, `category`, `user_email`, `initial_update`

4. **Error Handling**: Validates agent existence and required fields

## Use Cases

- **Automated Task Generation**: Agents break down large projects into subtasks
- **Recurring Tasks**: Combine with Timer skill for periodic task creation
- **AI-Driven Management**: Let agents suggest and create tasks based on analysis
- **Workflow Automation**: Create follow-up tasks automatically
- **Smart Reminders**: Agents create reminder tasks for deadlines

## Integration with Other Skills

### Combine with Timer Skill
```javascript
// Agent creates a weekly review task automatically
await fetch(`/api/agents/${agentId}/skills/timer`, {
  method: 'POST',
  body: JSON.stringify({
    interval: 604800,  // 7 days
    instruction: "Create a weekly review task using the add_task skill"
  })
});
```

## Files Modified

1. `/backend/skills/add_task.py` - **NEW** - Core skill implementation
2. `/backend/skills/__init__.py` - Updated to export `AddTaskSkill`
3. `/backend/app.py` - Added 3 new API endpoints
4. `/backend/skills/SKILL_ADD_TASK.md` - **NEW** - Comprehensive documentation
5. `/backend/test_add_task_skill.py` - **NEW** - Test suite

## Next Steps

### Frontend Integration (Optional)
You may want to add UI components to:
1. Display Add Task skill status on agent cards
2. Show tasks created by each agent
3. Add a button to manually trigger task creation via agent
4. Display skill statistics in agent detail view

### Example UI Integration Points:
- `AgentItem.jsx` - Show "Add Task" badge if skill is enabled
- `ChatInterface.jsx` - Allow agents to create tasks through conversation
- Add skill management UI to enable/disable skills per agent

## Testing

The backend is currently running and the skill has been tested successfully:

✅ Agent creation
✅ Task creation with full parameters
✅ Task retrieval by agent
✅ Skill status and statistics
✅ Error handling for invalid requests

All tests passed! The skill is ready to use.

## Support

- Full documentation: `/backend/skills/SKILL_ADD_TASK.md`
- Test examples: `/backend/test_add_task_skill.py`
- Backend logs: Check console output for `[AddTaskSkill]` messages
