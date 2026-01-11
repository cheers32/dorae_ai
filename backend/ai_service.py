import os
from google import genai
import json
from pydantic import BaseModel

class AIService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            self.client = genai.Client(api_key=api_key)
        else:
            self.client = None

    def analyze_task(self, task_title, updates):
        if not self.client:
            print("AI Service: Missing API Key")
            return {
                "summary": "AI not configured (Gemini 3.0)",
                "suggestions": "Please set GEMINI_API_KEY in .env",
                "priority": "medium",
                "category": "General",
                "importance": 3
            }

        updates_text = "\n".join([f"- {u['content']}" for u in updates])
        prompt = f"""
        Analyze this task and provide structured feedback.
        
        Task: {task_title}
        Updates/Details:
        {updates_text}
        
        Return a valid JSON object with these fields:
        - summary: A brief summary of the status.
        - suggestions: 1-2 actionable next steps.
        - priority: "high", "medium", or "low".
        - category: A loose category label (e.g., "Development", "Personal", "Research").
        - importance: An integer 1-5 (5 is highest).
        """
        
        try:
            # Using Gemini 3.0 Pro
            response = self.client.models.generate_content(
                model='gemini-2.0-flash', # Note: Using 2.0 Flash as 3.0 access is rolling out, but SDK structure is ready
                contents=prompt,
                config={
                    'response_mime_type': 'application/json'
                }
            )
            
            # With response_mime_type='application/json', text should be parsed directly
            # safely handling potentially non-parsed text if needed
            if hasattr(response, 'parsed') and response.parsed:
                return response.parsed
            
            text = response.text
            return json.loads(text)
        except Exception as e:
            print(f"AI Error: {e}")
            return None

    def chat_with_task_context(self, user_message, tasks_context):
        if not self.client:
            return "I can't help you with that right now because the API key is missing."

        # Format tasks for context
        task_list_str = ""
        for task in tasks_context:
            status = task.get('status', 'unknown')
            title = task.get('title', 'Untitled')
            priority = task.get('priority', 'medium')
            task_list_str += f"- [{status.upper()}] {title} (Priority: {priority})\n"

        system_instruction = f"""
        You are Dorae, an AI Task Assistant.
        You have access to the user's current tasks:
        
        {task_list_str}
        
        Answer the user's questions based on these tasks. 
        Be helpful, concise, and encouraging. 
        If asked to summarize, use the provided list.
        """

        try:
            # Using Gemini 3.0 Pro (or 2.0 Flash as placeholder)
            response = self.client.models.generate_content(
                model='gemini-2.0-flash', 
                contents=f"{system_instruction}\n\nUser: {user_message}",
            )
            return response.text
        except Exception as e:
            print(f"Chat Error: {e}")
            return "I encountered an error trying to process your request."

