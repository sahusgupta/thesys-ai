# agents/context_agent/agent.py
from typing import Dict, Any

class ContextAgent:
    """
    The ContextAgent keeps track of user conversation context or 
    relevant doc references. Minimal example: we store up to 5 prior queries 
    in a session context. 
    """
    def __init__(self):
        # A simple dictionary: chat_id -> list of prior messages
        self.session_context = {}

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
