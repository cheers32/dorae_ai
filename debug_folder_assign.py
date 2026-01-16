import requests
import json

BASE_URL = 'http://127.0.0.1:5001/api'

def run_test():
    # 1. Create a Folder
    print("Creating folder...")
    res = requests.post(f'{BASE_URL}/folders', json={'name': 'Debug Folder'})
    if res.status_code != 201:
        print("Failed to create folder", res.text)
        return
    folder = res.json()
    folder_id = folder['_id']
    print(f"Folder created: {folder_id}")

    # 2. Create Tasks in Folder
    print("Creating tasks...")
    task1 = requests.post(f'{BASE_URL}/tasks', json={'title': 'Task 1', 'folderId': folder_id}).json()
    task2 = requests.post(f'{BASE_URL}/tasks', json={'title': 'Task 2', 'folderId': folder_id}).json()
    print(f"Tasks created: {task1['_id']}, {task2['_id']}")

    # 3. Create Agent
    print("Creating agent...")
    agent = requests.post(f'{BASE_URL}/agents', json={'name': 'Debug Agent'}).json()
    agent_id = agent['_id']
    print(f"Agent created: {agent_id}")

    # 4. Assign Folder to Agent (New Endpoint)
    print("Assigning folder to agent...")
    res = requests.post(f'{BASE_URL}/folders/{folder_id}/assign_agent', json={'agentId': agent_id})
    print("Assign result:", res.text)

    # 5. Fetch Agents and Inspect
    print("Fetching agents...")
    agents = requests.get(f'{BASE_URL}/agents').json()
    target_agent = next((a for a in agents if a['_id'] == agent_id), None)
    
    if not target_agent:
        print("Agent not found in list")
        return

    print("\n--- INPECTION ---")
    print(f"Agent ID: {target_agent['_id']}")
    print(f"Assigned Check: 'assigned_folder_ids' in agent: {target_agent.get('assigned_folder_ids')}")
    print(f"Assigned Folders (expanded): {target_agent.get('assigned_folders')}")
    print(f"Active Tasks (should be EMPTY): {target_agent.get('active_tasks')}")

    active_tasks = target_agent.get('active_tasks', [])
    assigned_folders = target_agent.get('assigned_folders', [])

    if len(assigned_folders) == 1 and len(active_tasks) == 0:
        print("\n✅ SUCCESS: Folder is assigned and tasks are hidden.")
    else:
        print("\n❌ FAILED: Metadata mismatch.")
        if len(active_tasks) > 0:
            print(f"  - Expected 0 active tasks, got {len(active_tasks)}")
        if len(assigned_folders) == 0:
            print("  - Expected 1 assigned folder, got 0")

if __name__ == '__main__':
    run_test()
