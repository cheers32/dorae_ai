import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

try:
    print("Listing models with client.models.list()...")
    # Note: method might be differnt in new SDK, trying standard iterate
    # If list() returns an iterator
    for m in client.models.list():
        print(f"Found: {m.name}")
        
except Exception as e:
    print(f"List Error: {e}")
