import os
import google.generativeai as genai
import json

class AIService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None

    def analyze_task(self, task_title, updates):
        if not self.model:
            return {
                "summary": "AI not configured",
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
        
        Return a JSON object with these fields:
        - summary: A brief summary of the status.
        - suggestions: 1-2 actionable next steps.
        - priority: "high", "medium", or "low".
        - category: A loose category label (e.g., "Development", "Personal", "Research").
        - importance: An integer 1-5 (5 is highest).
        """
        
        try:
            response = self.model.generate_content(prompt)
            # Cleanup json string if needed (sometimes Gemini returns markdown backticks)
            text = response.text
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
                
            return json.loads(text)
        except Exception as e:
            print(f"AI Error: {e}")
            return None
