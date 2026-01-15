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
            # Using Gemini 3.0 Flash Preview (Pro has quota limits)
            response = self.client.models.generate_content(
                model='gemini-3-flash-preview', 
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

    def chat_with_task_context(self, user_message, tasks_context, agent_context=None):
        if not self.client:
            return "I can't help you with that right now because the API key is missing."

        # Format tasks for context with enriched information
        task_list_str = ""
        for task in tasks_context:
            status = task.get('status', 'unknown')
            title = task.get('title', 'Untitled')
            priority = task.get('priority', 'medium')
            category = task.get('category', 'General')
            labels = task.get('labels', [])
            folder = task.get('folder')
            recent_updates = task.get('recent_updates', [])
            linked_items = task.get('linked_items', [])
            
            # Build task entry with all context
            task_entry = f"- [{status.upper()}] {title}\n"
            task_entry += f"  Priority: {priority} | Category: {category}\n"
            
            if labels:
                task_entry += f"  Tags: {', '.join(labels)}\n"
            if folder:
                task_entry += f"  Folder/Project: {folder}\n"
            if recent_updates:
                task_entry += f"  Recent Progress: {' → '.join(recent_updates)}\n"
            if linked_items:
                # Linked items are CONTEXT, not tasks
                task_entry += f"  Context Items: {len(linked_items)} linked resources\n"
            
            task_list_str += task_entry + "\n"

        # Always use default Dorae persona for consistent quality
        agent_name = "Dorae"
        agent_role = "AI Task Assistant"
        agent_instruction = """You are Dorae, an AI Task Assistant. Be helpful, concise, and encouraging.

IMPORTANT INSTRUCTIONS:
1. Use TAGS (labels) to understand task categories and themes
2. Use FOLDERS to understand which project/area a task belongs to
3. Review RECENT PROGRESS to understand what's been done
4. Check CONTEXT ITEMS (linked_items) for reference materials - these are NOT tasks themselves
5. DO NOT confuse context items with tasks - context items are resources that support tasks
6. When discussing tasks, consider their full context including tags, folder, and progress"""
        agent_notes_str = ""

        # Note: agent_context is used for task filtering in app.py,
        # but we ignore custom agent persona to maintain quality

        system_instruction = f"""
        Name: {agent_name}
        Role: {agent_role}
        
        System Instructions:
        {agent_instruction}
        
        {agent_notes_str}

        Context (User's Current Tasks):
        {task_list_str}
        
        Task: Answer the user's questions based on your persona and the task context.
        If asked to summarize, use the provided task list.
        """

        try:
            # Using Gemini 3.0 Flash Preview
            response = self.client.models.generate_content(
                model='gemini-3-flash-preview', 
                contents=f"{system_instruction}\n\nUser: {user_message}",
            )
            return response.text
        except Exception as e:
            print(f"Chat Error: {e}")
            return "I encountered an error trying to process your request."

    def execute_instruction(self, instruction, task_context, current_time):
        if not self.client:
            print("AI Service: Missing API Key")
            return None

        prompt = f"""
        You are an AI Agent executing a timed instruction.
        
        Instruction: "{instruction}"
        Current Time: {current_time}
        
        Task Context:
        Title: {task_context.get('title')}
        Status: {task_context.get('status')}
        Latest Update: {task_context.get('last_update', 'None')}
        
        Based on the instruction, determine the action to take.
        Supported actions:
        1. "add_update": Add a text update to the task.
        
        Return a VALID JSON object (no markdown formatting):
        {{
            "action": "add_update",
            "content": "The text content to add to the task updates"
        }}
        """
        
        try:
            response = self.client.models.generate_content(
                model='gemini-2.0-flash-exp', 
                contents=prompt,
                config={
                    'response_mime_type': 'application/json'
                }
            )
            
            if hasattr(response, 'parsed') and response.parsed:
                return response.parsed
                
            return json.loads(response.text)
        except Exception as e:
            print(f"Instruction Error: {e}")
            return None

