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

        # Get agent skills if available
        agent_skills = []
        agent_name = "Dorae"
        agent_role = "AI Task Assistant"
        
        if agent_context:
            agent_name = agent_context.get('name', 'Dorae')
            agent_role = agent_context.get('role', 'AI Task Assistant')
            agent_skills = agent_context.get('skills', [])

        # Define all possible skills in the system
        ALL_SKILLS = {
            'add_task': "Add Task (Ability to create new tasks programmatically)",
            'timer': "Timer (Ability to schedule periodic actions/alerts on tasks)"
        }

        # Build status strings
        enabled_skills_str = "\n".join([f"- {ALL_SKILLS[s]}" for s in agent_skills if s in ALL_SKILLS]) or "None"
        disabled_skills_str = "\n".join([f"- {desc}" for s, desc in ALL_SKILLS.items() if s not in agent_skills]) or "None"

        skills_context = f"""
YOUR SKILL STATUS:
ENABLED SKILLS:
{enabled_skills_str}

DISABLED SKILLS (Unavailable):
{disabled_skills_str}

CRITICAL INSTRUCTION:
- Before responding to any request that involves creating tasks or setting timers, you MUST check if the corresponding skill is in your "ENABLED SKILLS" list.
- If the skill is DISABLED, you MUST NOT claim you can do it. Instead, politely inform the user that you don't have that skill enabled yet, and they can enable it in your "Add AI Skill" menu on your agent card.
- DO NOT hallucinate that you have created a task if the "Add Task" skill is disabled.
"""

        agent_instruction = f"""You are {agent_name}, an AI {agent_role}. Be helpful, concise, and encouraging.

IMPORTANT INSTRUCTIONS:
1. Use TAGS (labels) to understand task categories and themes
2. Use FOLDERS to understand which project/area a task belongs to
3. Review RECENT PROGRESS to understand what's been done
4. Check CONTEXT ITEMS (linked_items) for reference materials - these are NOT tasks themselves
5. DO NOT confuse context items with tasks - context items are resources that support tasks
6. When discussing tasks, consider their full context including tags, folder, and progress
{skills_context}"""

        # Only add function calling if agent has add_task skill
        has_add_task = 'add_task' in agent_skills
        if has_add_task:
            agent_instruction += """

CREATING TASKS:
- When the user asks you to create a task, you MUST use the create_task tool.
- Extract task details from the conversation (title, priority, category, labels).
- ALWAYS call the tool - do not just say you will create it in text.
- Once the tool is called, the system will handle the actual creation.
"""

        agent_notes_str = ""

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
            # If agent has add_task skill, use function calling
            if has_add_task:
                from google.genai import types
                
                # Define the create_task tool
                create_task_declaration = types.FunctionDeclaration(
                    name="create_task",
                    description="Create a new task in the task management system",
                    parameters={
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "The title of the task"
                            },
                            "priority": {
                                "type": "string",
                                "description": "Priority level",
                                "enum": ["low", "medium", "high"]
                            },
                            "category": {
                                "type": "string",
                                "description": "Task category (e.g., Development, Design, Business)"
                            },
                            "labels": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "List of labels/tags for the task"
                            },
                            "initial_update": {
                                "type": "string",
                                "description": "Initial description or update for the task"
                            }
                        },
                        "required": ["title"]
                    }
                )
                
                task_tool = types.Tool(function_declarations=[create_task_declaration])
                
                # We use regular chat logic but with tools enabled
                # Using gemini-2.0-flash-exp for better tool use reliability
                response = self.client.models.generate_content(
                    model='gemini-2.0-flash-exp',
                    contents=f"{system_instruction}\n\nUser: {user_message}",
                    config=types.GenerateContentConfig(
                        tools=[task_tool],
                        temperature=0.7
                    )
                )
                
                # Process function calls
                if response.candidates and response.candidates[0].content.parts:
                    for part in response.candidates[0].content.parts:
                        # Check for function_call attribute
                        fc = getattr(part, 'function_call', None)
                        if fc and fc.name == "create_task":
                            # Return structured response for app.py to handle
                            return {
                                "action": "create_task",
                                "task_data": dict(fc.args)
                            }
                
                # If no function call, return text response
                return response.text
                
            else:
                # Regular chat without function calling
                response = self.client.models.generate_content(
                    model='gemini-2.0-flash-exp', # Use Flash 2.0 for consistent quality
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

