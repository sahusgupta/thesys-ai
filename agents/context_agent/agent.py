# agents/context_agent/agent.py
from typing import List, Dict, Any
import logging
from datetime import datetime
import boto3
import os
from pathlib import Path
import json

class ContextAgent:
    """
    The ContextAgent keeps track of user conversation context or 
    relevant doc references. Minimal example: we store up to 5 prior queries 
    in a session context. 
    """
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.s3_client = boto3.client('s3')
        self.s3_bucket = os.getenv('S3_BUCKET')
        self.context_dir = Path("data/context")
        self.context_dir.mkdir(parents=True, exist_ok=True)

    def get_user_context(self, user_id: str) -> Dict[str, Any]:
        """Get user's context including uploaded papers and chat history."""
        try:
            # Get user's uploaded papers
            papers = self._get_user_papers(user_id)
            
            # Get chat history
            chat_history = self._get_chat_history(user_id)
            
            return {
                'papers': papers,
                'chat_history': chat_history
            }
        except Exception as e:
            self.logger.error(f"Error getting user context: {str(e)}")
            return {'papers': [], 'chat_history': []}

    def _get_user_papers(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's uploaded papers from S3."""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.s3_bucket,
                Prefix=f"user_uploads/{user_id}/"
            )
            
            papers = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    metadata = self.s3_client.head_object(
                        Bucket=self.s3_bucket,
                        Key=obj['Key']
                    )['Metadata']
                    
                    # Generate pre-signed URL for content access
                    url = self.s3_client.generate_presigned_url(
                        'get_object',
                        Params={
                            'Bucket': self.s3_bucket,
                            'Key': obj['Key']
                        },
                        ExpiresIn=3600
                    )
                    
                    papers.append({
                        'id': obj['Key'].split('/')[2],
                        'title': metadata.get('file_name', obj['Key'].split('/')[-1]),
                        'type': metadata.get('file_type', 'application/octet-stream'),
                        'url': url,
                        'uploaded_at': metadata.get('created_at', obj['LastModified'].isoformat())
                    })
            
            return papers
        except Exception as e:
            self.logger.error(f"Error getting user papers: {str(e)}")
            return []

    def _get_chat_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's chat history."""
        try:
            # Try to get chat history from S3
            try:
                response = self.s3_client.get_object(
                    Bucket=self.s3_bucket,
                    Key=f"chat_history/{user_id}/history.json"
                )
                return json.loads(response['Body'].read().decode('utf-8'))
            except:
                # If no history exists, return empty list
                return []
        except Exception as e:
            self.logger.error(f"Error getting chat history: {str(e)}")
            return []

    def save_chat_history(self, user_id: str, chat_history: List[Dict[str, Any]]) -> bool:
        """Save chat history for a user."""
        try:
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=f"chat_history/{user_id}/history.json",
                Body=json.dumps(chat_history).encode('utf-8'),
                ContentType='application/json'
            )
            return True
        except Exception as e:
            self.logger.error(f"Error saving chat history: {str(e)}")
            return False

    def add_to_chat_history(self, user_id: str, message: Dict[str, Any]) -> bool:
        """Add a message to the user's chat history."""
        try:
            chat_history = self._get_chat_history(user_id)
            chat_history.append({
                **message,
                'timestamp': datetime.now().isoformat()
            })
            return self.save_chat_history(user_id, chat_history)
        except Exception as e:
            self.logger.error(f"Error adding to chat history: {str(e)}")
            return False

    def process_query(self, query: str) -> Dict[str, Any]:
        """
        For direct orchestrator usage: 
        Possibly merges the new query into the session context 
        and returns the last few messages as 'context'.
        """
        # Without a chat_id, we store in 'default' 
        chat_id = "default"
        if "chat_id=" in query:
            # parse a real chat id from the query (demonstration only)
            chat_id = query.split("chat_id=")[-1].strip()

        if chat_id not in self.session_context:
            self.session_context[chat_id] = []

        self.session_context[chat_id].append(query)

        # Return the last 5 messages as 'context'
        context_messages = self.session_context[chat_id][-5:]

        return {
            "context": context_messages,
            "error": None
        }

    def store_context(self, chat_id: str, content: str) -> None:
        """
        Explicit method to store context from outside. 
        """
        if chat_id not in self.session_context:
            self.session_context[chat_id] = []
        self.session_context[chat_id].append(content)

    def retrieve_context(self, chat_id: str) -> Dict[str, Any]:
        """
        Return the stored messages for a given chat_id.
        """
        if chat_id not in self.session_context:
            return {"context": []}
        return {"context": self.session_context[chat_id]}

    def process_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        For agent_communication usage. 
        We'll store the 'text' in session_context, returning the last 5 messages as well.
        """
        chat_id = message["content"].get("chat_id", "default")
        user_text = message["content"].get("text", "")

        if chat_id not in self.session_context:
            self.session_context[chat_id] = []

        self.session_context[chat_id].append(user_text)
        last_five = self.session_context[chat_id][-5:]

        return {
            "message_id": message["id"],
            "result": {
                "context": last_five,
                "error": None
            }
        }
