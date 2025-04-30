from collections import deque
import logging
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ContextAgent:
    def __init__(self, max_history_len=50, max_activity_len=20):
        self.user_contexts = {}  # Store context per user_id
        self.max_history_len = max_history_len
        self.max_activity_len = max_activity_len
        logger.info("ContextAgent initialized.")

    def get_user_context(self, user_id: str) -> dict:
        """Retrieves the context for a given user, creating it if it doesn't exist."""
        if user_id not in self.user_contexts:
            # Initialize context for a new user
            self.user_contexts[user_id] = {
                'chat_history': [],
                'chats': {},  # Store different chat sessions if needed
                'current_chat_id': None,
                'activity_log': [],  # Initialize activity log here too
                'uploaded_files': [],  # Store uploaded files
                'liked_files': [],  # Store liked files
                # Add other context fields as needed
            }
            logger.info(f"Initialized new context for user_id: {user_id}")
        return self.user_contexts[user_id]

    def add_to_chat_history(self, user_id: str, message: dict):
        """Adds a message to the user's current chat history."""
        context = self.get_user_context(user_id)
        context['chat_history'].append(message)
        # Optional: Limit history size
        if len(context['chat_history']) > self.max_history_len:
            context['chat_history'] = context['chat_history'][-self.max_history_len:]

    def log_activity(self, user_id: str, activity_type: str, details: dict = None):
        """Logs an activity for the user."""
        context = self.get_user_context(user_id)
        timestamp = datetime.utcnow().isoformat() + 'Z'
        activity_log_entry = {
            'type': activity_type,
            'timestamp': timestamp,
            'details': details or {}
        }
        context['activity_log'].insert(0, activity_log_entry)  # Add to the beginning
        # Limit activity log size
        if len(context['activity_log']) > self.max_activity_len:
            context['activity_log'] = context['activity_log'][:self.max_activity_len]
        logger.debug(f"Logged activity for {user_id}: {activity_type}")

    def add_uploaded_file(self, user_id: str, file_name: str):
        """Adds a new uploaded file to the user's context."""
        logger.debug(f"Adding uploaded file for user {user_id}: {file_name}")
        context = self.get_user_context(user_id)
        timestamp = datetime.utcnow().isoformat() + 'Z'
        file_entry = {
            'file_name': file_name,
            'timestamp': timestamp
        }
        context['uploaded_files'].insert(0, file_entry)
        # Log the activity
        self.log_activity(user_id, 'document_upload', {'file_name': file_name})
        logger.info(f"Successfully logged upload activity for {file_name}")

    def add_liked_file(self, user_id: str, file_name: str):
        """Adds a new liked file to the user's context."""
        logger.debug(f"Adding liked file for user {user_id}: {file_name}")
        context = self.get_user_context(user_id)
        timestamp = datetime.utcnow().isoformat() + 'Z'
        like_entry = {
            'file_name': file_name,
            'timestamp': timestamp
        }
        context['liked_files'].insert(0, like_entry)
        # Log the activity
        self.log_activity(user_id, 'document_like', {'file_name': file_name})
        logger.info(f"Successfully logged like activity for {file_name}")

    def get_recent_activities(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent activities for a user, including document uploads, likes, and chat messages."""
        try:
            context = self.get_user_context(user_id)
            activities = []

            # 1. Get recent uploads
            for file_entry in context['uploaded_files'][:limit]:
                activities.append({
                    'type': 'document_upload',
                    'timestamp': file_entry['timestamp'],
                    'details': {
                        'file_name': file_entry['file_name'],
                        'message': f"Uploaded document: {file_entry['file_name']}"
                    }
                })

            # 2. Get recent likes
            for like_entry in context['liked_files'][:limit]:
                activities.append({
                    'type': 'document_like',
                    'timestamp': like_entry['timestamp'],
                    'details': {
                        'file_name': like_entry['file_name'],
                        'message': f"Liked document: {like_entry['file_name']}"
                    }
                })

            # 3. Get recent chat messages
            for message in context['chat_history'][-limit:]:
                if isinstance(message, dict):
                    activities.append({
                        'type': 'chat_message',
                        'timestamp': message.get('timestamp', datetime.utcnow().isoformat() + 'Z'),
                        'details': {
                            'message': message.get('content', ''),
                            'is_user_message': message.get('role') == 'user',
                            'message_text': f"{'You' if message.get('role') == 'user' else 'Assistant'} sent a message"
                        }
                    })

            # Sort all activities by timestamp and limit to requested number
            activities.sort(key=lambda x: x['timestamp'], reverse=True)
            return activities[:limit]

        except Exception as e:
            logger.error(f"Error getting recent activities: {str(e)}")
            return []

    def get_dashboard_data(self, user_id: str) -> dict:
        """Gathers data for the user's dashboard."""
        context = self.get_user_context(user_id)
        recent_activities = self.get_recent_activities(user_id, limit=5)
        chat_history = context.get('chat_history', [])
        num_chats = len(context.get('chats', {}))
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