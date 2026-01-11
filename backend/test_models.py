import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

try:
    print("Listing models...")
    # The new SDK might have a different way to list, but let's try the standard client.models.list() if available
    # Or just try to hit a known stable model
    
    # Try 1.5 Flash again with different ID
    models_to_test = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro", 
        "gemini-1.0-pro"
    ]
    
    for m in models_to_test:
        print(f"Testing {m}...")
        try:
            client.models.generate_content(model=m, contents="Hi")
            print(f"SUCCESS: {m} works!")
            break
        except Exception as e:
            print(f"Failed {m}: {e}")

except Exception as e:
    print(f"Error: {e}")
