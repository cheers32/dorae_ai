import requests
import time
import json

API_BASE = "http://127.0.0.1:5001/api"

def verify_auto_duplication():
    print("--- Verifying Automated Duplication Scan ---")
    
    # 1. Create a test folder
    folder_res = requests.post(f"{API_BASE}/folders", json={"name": "Duplicate Test Folder"})
    folder = folder_res.json()
    folder_id = folder['_id']
    print(f"Created folder: {folder_id}")

    # 2. Create Task A
    task_a_res = requests.post(f"{API_BASE}/tasks", json={
        "title": "Buy milk at the grocery store",
        "folderId": folder_id,
        "labels": []
    })
    task_a = task_a_res.json()
    print(f"Created Task A: {task_a['_id']}")

    # 3. Create Task B (Duplicate of A)
    task_b_res = requests.post(f"{API_BASE}/tasks", json={
        "title": "Purchase cow milk from market",
        "folderId": folder_id,
        "labels": []
    })
    task_b = task_b_res.json()
    print(f"Created Task B: {task_b['_id']}")

    # 4. Wait for background analysis
    wait_time = 45
    print(f"Waiting {wait_time} seconds for background analysis...")
    time.sleep(wait_time)

    # 5. Check if one of them is marked as Duplicate
    tasks_res = requests.get(f"{API_BASE}/tasks?folderId={folder_id}")
    tasks = tasks_res.json().get('tasks', [])
    
    duplicate_found = False
    for t in tasks:
        print(f"Task: {t['title']}, Labels: {t.get('labels', [])}")
        if "Duplicate" in t.get('labels', []):
            duplicate_found = True
            print(f"SUCCESS: Task '{t['title']}' marked as Duplicate")

    if not duplicate_found:
        print("FAILURE: No tasks marked as Duplicate")

    # Cleanup
    requests.delete(f"{API_BASE}/tasks/{task_a['_id']}")
    requests.delete(f"{API_BASE}/tasks/{task_b['_id']}")
    requests.delete(f"{API_BASE}/folders/{folder_id}")
    print("Cleanup complete.")

if __name__ == "__main__":
    verify_auto_duplication()
