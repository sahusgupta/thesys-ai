from collections import deque
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ContextAgent:
    def __init__(self, max_history_len=50, max_activity_len=20):
        self.user_contexts = {}
        self.max_history_len = max_history_len
        self.user_activities = {}
        self.max_activity_len = max_activity_len
        logger.info("ContextAgent initialized.")

    def get_user_context(self, user_id: str) -> dict:
        """Retrieves the context for a given user, creating it if it doesn't exist."""
        if user_id not in self.user_contexts:
            # Initialize context for a new user
            self.user_contexts[user_id] = {
                'chat_history': [],
                'chats': {}, # Store different chat sessions if needed
                'current_chat_id': None,
                'activity_log': [], # Initialize activity log here too
                # Add other context fields as needed
            }
            logger.info(f"Initialized new context for user_id: {user_id}")
        # Ensure activity_log exists even for older contexts if added later
        if 'activity_log' not in self.user_contexts[user_id]:
             self.user_contexts[user_id]['activity_log'] = []
        return self.user_contexts[user_id]

    def add_to_chat_history(self, user_id: str, message: dict):
        """Adds a message to the user's current chat history."""
        context = self.get_user_context(user_id) # Ensure context exists
        # Simple implementation: Add to a single history list
        # You might enhance this later to use context['current_chat_id']
        context['chat_history'].append(message)
        # Optional: Limit history size
        if len(context['chat_history']) > self.max_history_len:
            context['chat_history'] = context['chat_history'][-self.max_history_len:]

    def log_activity(self, user_id: str, activity_type: str, details: dict = None):
        """Logs an activity for the user."""
        context = self.get_user_context(user_id) # Ensure context exists before logging
        timestamp = datetime.utcnow().isoformat() + 'Z'
        activity_log_entry = { # Renamed variable to avoid conflict
            'type': activity_type,
            'timestamp': timestamp,
            'details': details or {}
        }
        # Use the activity_log list directly from the context
        context['activity_log'].insert(0, activity_log_entry) # Add to the beginning
        # Limit activity log size
        if len(context['activity_log']) > self.max_activity_len:
            context['activity_log'] = context['activity_log'][:self.max_activity_len]
        logger.debug(f"Logged activity for {user_id}: {activity_type}")

    def get_recent_activities(self, user_id: str, limit: int = 10) -> list:
        """Gets the most recent activities for the user."""
        context = self.get_user_context(user_id) # Ensure context exists
        return context.get('activity_log', [])[:limit]

    def get_dashboard_data(self, user_id: str) -> dict:
        """Gathers data for the user's dashboard."""
        # These calls should now work correctly after implementing get_user_context
        recent_activities = self.get_recent_activities(user_id, limit=5)
        context = self.get_user_context(user_id) # Get context once
        chat_history = context.get('chat_history', [])
        num_chats = len(context.get('chats', {})) # Use context variable
        num_messages = len(chat_history)
        num_pinned = sum(1 for msg in chat_history if isinstance(msg, dict) and msg.get('pinned'))

        logger.info(f"Dashboard data for {user_id}: {len(recent_activities)} activities, {num_chats} chats, {num_messages} messages.")

        return {
            'recent_activities': recent_activities,
            'stats': {
                'num_chats': num_chats,
                'total_messages': num_messages,
                'pinned_messages': num_pinned,
            }
        }

    # You might want methods to persist/load context and activities to disk/db 