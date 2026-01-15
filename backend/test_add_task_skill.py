#!/usr/bin/env python3
"""
Test script for the Add Task skill.

This script demonstrates:
1. Creating an agent
2. Using the Add Task skill to create tasks
3. Retrieving tasks created by the agent
4. Checking skill status and statistics
"""

import requests
import json

BASE_URL = "http://localhost:5001"

def test_add_task_skill():
    print("=" * 60)
    print("Testing Add Task Skill")
    print("=" * 60)
    
    # Step 1: Create a test agent
    print("\n1. Creating a test agent...")
    agent_data = {
        "name": "Task Creator Bot",
        "description": "An AI agent that creates tasks automatically",
        "role": "Task Manager",
        "skills": ["add_task"]
    }
    
    response = requests.post(f"{BASE_URL}/api/agents", json=agent_data)
    if response.status_code == 201:
        agent = response.json()
        agent_id = agent['_id']
        print(f"✅ Created agent: {agent['name']} (ID: {agent_id})")
    else:
        print(f"❌ Failed to create agent: {response.text}")
        return
    
    # Step 2: Create a task via the Add Task skill
    print("\n2. Creating a task via Add Task skill...")
    task_data = {
        "title": "Implement user authentication system",
        "labels": ["backend", "security", "urgent"],
        "priority": "high",
        "category": "Development",
        "initial_update": "Need to set up OAuth2 with Google and GitHub providers"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/agents/{agent_id}/skills/add-task",
        json=task_data
    )
    
    if response.status_code == 201:
        result = response.json()
        task = result['task']
        print(f"✅ Created task: {task['title']}")
        print(f"   Task ID: {task['_id']}")
        print(f"   Priority: {task['priority']}")
        print(f"   Labels: {', '.join(task['labels'])}")
        print(f"   Assigned to: Agent {task['assigned_agent_id']}")
    else:
        print(f"❌ Failed to create task: {response.text}")
        return
    
    # Step 3: Create another task
    print("\n3. Creating another task...")
    task_data_2 = {
        "title": "Design landing page mockup",
        "labels": ["design", "frontend"],
        "priority": "medium",
        "category": "Design",
        "initial_update": "Create a modern, responsive landing page design"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/agents/{agent_id}/skills/add-task",
        json=task_data_2
    )
    
    if response.status_code == 201:
        result = response.json()
        task = result['task']
        print(f"✅ Created task: {task['title']}")
        print(f"   Task ID: {task['_id']}")
    else:
        print(f"❌ Failed to create task: {response.text}")
    
    # Step 4: Create a third task
    print("\n4. Creating a third task...")
    task_data_3 = {
        "title": "Write API documentation",
        "labels": ["documentation"],
        "priority": "low",
        "category": "Documentation"
    }
    
    response = requests.post(
        f"{BASE_URL}/api/agents/{agent_id}/skills/add-task",
        json=task_data_3
    )
    
    if response.status_code == 201:
        result = response.json()
        task = result['task']
        print(f"✅ Created task: {task['title']}")
        print(f"   Task ID: {task['_id']}")
    else:
        print(f"❌ Failed to create task: {response.text}")
    
    # Step 5: Get all tasks created by this agent
    print(f"\n5. Retrieving tasks created by agent {agent_id}...")
    response = requests.get(
        f"{BASE_URL}/api/agents/{agent_id}/skills/add-task/tasks?limit=10"
    )
    
    if response.status_code == 200:
        result = response.json()
        tasks = result['tasks']
        count = result['count']
        print(f"✅ Found {count} tasks created by this agent:")
        for i, task in enumerate(tasks, 1):
            print(f"   {i}. {task['title']} (Priority: {task['priority']})")
    else:
        print(f"❌ Failed to retrieve tasks: {response.text}")
    
    # Step 6: Check skill status and statistics
    print(f"\n6. Checking Add Task skill status...")
    response = requests.get(
        f"{BASE_URL}/api/agents/{agent_id}/skills/add-task"
    )
    
    if response.status_code == 200:
        status = response.json()
        print(f"✅ Skill Status:")
        print(f"   Skill: {status['skill']}")
        print(f"   Status: {status['status']}")
        print(f"   Agent: {status['agent']['name']}")
        print(f"   Total tasks created: {status['statistics']['total_tasks_created']}")
        print(f"   Tasks created (last 24h): {status['statistics']['tasks_created_last_24h']}")
    else:
        print(f"❌ Failed to check skill status: {response.text}")
    
    # Step 7: Test error handling (missing title)
    print("\n7. Testing error handling (missing title)...")
    response = requests.post(
        f"{BASE_URL}/api/agents/{agent_id}/skills/add-task",
        json={"priority": "high"}  # Missing title
    )
    
    if response.status_code == 400:
        error = response.json()
        print(f"✅ Correctly rejected invalid request: {error['error']}")
    else:
        print(f"❌ Should have returned 400 error")
    
    print("\n" + "=" * 60)
    print("Add Task Skill Test Complete!")
    print("=" * 60)
    print(f"\nAgent ID for future reference: {agent_id}")
    print(f"\nYou can view the created tasks in the frontend at:")
    print(f"http://localhost:5173")

if __name__ == "__main__":
    try:
        test_add_task_skill()
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to backend server.")
        print("   Make sure the backend is running on http://localhost:5001")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
