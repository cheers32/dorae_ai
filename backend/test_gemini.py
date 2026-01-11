import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
print(f"Testing API Key: {api_key[:5]}...{api_key[-5:] if api_key else 'None'}")

if not api_key:
    print("Error: No API Key found")
    exit(1)

client = genai.Client(api_key=api_key)

try:
    print("Testing gemini-3-pro-preview...")
    response = client.models.generate_content(
        model='gemini-3-pro-preview', 
        contents="Hello"
    )
    print("Success 3-Pro!")
except Exception as e:
    print(f"Error 3-Pro: {e}")

try:
    print("Testing gemini-3-flash-preview...")
    response = client.models.generate_content(
        model='gemini-3-flash-preview', 
        contents="Hello"
    )
    print("Success 3-Flash!")
except Exception as e:
    print(f"Error 3-Flash: {e}")
