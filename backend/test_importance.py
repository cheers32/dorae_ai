
import requests

API_BASE = "http://localhost:5001/api"

def create_task(title):
    res = requests.post(f"{API_BASE}/tasks", json={"title": title, "status": "Active"})
    return res.json()

def run_analysis():
    res = requests.post(f"{API_BASE}/tasks/analyze_importance")
    return res.json()

# Create a task that should be Notable
t1 = create_task("Update API documentation for new endpoints")
print(f"Created task: {t1['_id']}")

# Run analysis
print("Running Global Analysis...")
analysis = run_analysis()
print(f"Analysis Result: {analysis}")
