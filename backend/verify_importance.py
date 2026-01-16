import requests
import json

BASE_URL = "http://localhost:5001/api"

def verify_importance_feature():
    # 1. Create a Folder
    print("[1] Creating Test Folder...")
    folder_res = requests.post(f"{BASE_URL}/folders", json={"name": "Importance Test Folder"})
    if folder_res.status_code != 200 and folder_res.status_code != 201:
        print("Failed to create folder:", folder_res.text)
        return
    folder = folder_res.json()
    folder_id = folder.get('_id') or folder.get('id')
    print(f"    Folder Created: {folder_id}")

    # 2. Create Tasks (Some important, some not)
    print("\n[2] Creating Tasks...")
    tasks_data = [
        {"title": "Urgent: Fix production crash", "folderId": folder_id},
        {"title": "Buy milk", "folderId": folder_id},
        {"title": "Critical: Database migration plan", "folderId": folder_id},
         {"title": "Update readme typo", "folderId": folder_id}
    ]
    
    start_tasks = []
    for t in tasks_data:
        res = requests.post(f"{BASE_URL}/tasks", json=t)
        start_tasks.append(res.json())
        print(f"    Created: {t['title']}")

    # 3. Run Importance Analysis
    print("\n[3] Running Importance Analysis...")
    analyze_url = f"{BASE_URL}/folders/{folder_id}/analyze_importance"
    analyze_res = requests.post(analyze_url)
    
    if analyze_res.status_code != 200:
        print("Analysis Failed:", analyze_res.text)
        return
    
    data = analyze_res.json()
    print(f"    Response: {data}")
    
    if data.get('important_count', 0) == 0:
        print("    WARNING: No tasks marked as important (might be AI variance or configuration)")
    
    # 4. Verify Tasks have "Important" label
    print("\n[4] Verifying Labels...")
    # Fetch tasks in folder again
    tasks_res = requests.get(f"{BASE_URL}/tasks?folderId={folder_id}&status=Active")
    tasks = tasks_res.json().get('tasks', [])  # Handle new pagination format
    if isinstance(tasks_res.json(), list): # Legacy format fallback
         tasks = tasks_res.json()
         
    for t in tasks:
        is_important = "Important" in t.get('labels', [])
        print(f"    Task '{t['title']}': Important={is_important}")
        
    # Cleanup
    print("\n[5] Cleanup...")
    requests.delete(f"{BASE_URL}/folders/{folder_id}")
    for t in start_tasks:
        requests.delete(f"{BASE_URL}/tasks/{t['_id'] or t['id']}")

if __name__ == "__main__":
    verify_importance_feature()
