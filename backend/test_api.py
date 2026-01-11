import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000/api/tasks"

def test_api():
    print("1. Creating Task...")
    res = requests.post(BASE_URL, json={"title": "Test Task 1"})
    print(res.status_code, res.json())
    if res.status_code != 201:
        print("Failed to create task")
        return
    
    task_id = res.json()['_id']
    print(f"Task ID: {task_id}")
    
    print("\n2. Getting Tasks...")
    res = requests.get(BASE_URL)
    print(json.dumps(res.json(), indent=2))
    
    print("\n3. Adding Update...")
    res = requests.post(f"{BASE_URL}/{task_id}/update", json={"content": "Initial detail"})
    print(res.status_code, res.json())
    update_id = res.json()['id']
    
    print("\n4. Editing Update...")
    res = requests.put(f"{BASE_URL}/{task_id}/update/{update_id}", json={"content": "Edited detail"})
    print(res.status_code, res.json())
    
    print("\n5. Closing Task...")
    res = requests.post(f"{BASE_URL}/{task_id}/close")
    print(res.status_code, res.json())
    
    print("\n6. Final Check...")
    res = requests.get(BASE_URL)
    print(json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    time.sleep(2) # Wait for server to start
    test_api()
