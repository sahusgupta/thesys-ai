# agent_communication.py
from typing import List, Any, Dict
import uuid
from queue import Queue
import threading

class AgentCommunicationProtocol:
    def __init__(self, agents: List[Any]):
        """
        Each 'agent' in the list is a fully implemented agent (ScholarAgent, FactCheckAgent, etc.).
        We'll store them in a dict by their class name, e.g. 'ScholarAgent': <instance>.
        Also create separate message queues for each agent to handle asynchronous sends.
        """
        self.agents = {type(agent).__name__: agent for agent in agents}
        self.message_queues = {agent_type: Queue() for agent_type in self.agents}
        self.response_queues = {agent_type: Queue() for agent_type in self.agents}
        # Start a dedicated thread for each agent to process incoming messages
        self._start_message_handlers()

    def _start_message_handlers(self):
        """Spin up a background thread for each agent to handle messages from its queue."""
        for agent_type in self.agents:
            threading.Thread(
                target=self._message_handler, 
                args=(agent_type,),
                daemon=True
            ).start()

    def _message_handler(self, agent_type: str):
        """Continuously process messages from agent_type's message queue."""
        agent = self.agents[agent_type]
        while True:
            message = self.message_queues[agent_type].get()  # block until new message
            try:
                # Each message is a dict with at least:
                # {
                #   "id": str (uuid),
                #   "sender": str (which agent or "User"),
                #   "content": {
                #       "text": <string user typed or partial data from other agent>,
                #       ... (other keys if needed)
                #   }
                #   "timestamp": ...
                # }
                # Agent calls its `process_message(...)` method.
                response = agent.process_message(message)
                self.response_queues[agent_type].put(response)
            except Exception as e:
                # If agent fails, we push an error result to the queue
                self.response_queues[agent_type].put({
                    'error': str(e),
                    'message_id': message.get('id'),
                    'agent_type': agent_type
                })

    def send_message(self, sender: str, recipient: str, message: Dict[str, Any]) -> str:
        """
        Send a single message from `sender` agent to `recipient` agent. 
        `message` is the content you want to pass. 
        Return the message_id (a UUID).
        """
        if recipient not in self.message_queues:
            raise ValueError(f"Recipient {recipient} not found in registered agents.")

        message_id = str(uuid.uuid4())
        full_message = {
            'id': message_id,
            'sender': sender,
            'content': message,    # e.g. { "text": "some text", "metadata": ...}
            'timestamp': threading.get_ident()
        }
        self.message_queues[recipient].put(full_message)
        return message_id

    def broadcast_message(self, sender: str, message: Dict[str, Any]) -> List[str]:
        """
        Send the same message from `sender` to all other agents.
        """
        message_ids = []
        for recipient in self.agents:
            if recipient != sender:
                msg_id = self.send_message(sender, recipient, message)
                message_ids.append(msg_id)
        return message_ids

    def get_response(self, agent_type: str, timeout: float = 5.0) -> Dict[str, Any]:
        """
        Wait for the next available response from the given agent's response queue.
        Times out after `timeout` seconds if no response arrives.
        """
        import queue
        try:
            response = self.response_queues[agent_type].get(timeout=timeout)
            return response
        except queue.Empty:
            return {
                'error': f"No response from {agent_type} within {timeout} seconds."
            }

    def clear_queues(self):
        """Empties both message and response queues for all agents."""
        for q in list(self.message_queues.values()) + list(self.response_queues.values()):
            while not q.empty():
                q.get()

    # -----------------------------------------------------------------------
    # ADVANCED MULTI-AGENT MESSAGING WORKFLOW
    # -----------------------------------------------------------------------
    def run_advanced_messaging_workflow(self, user_query: str) -> Dict[str, Any]:
        """
        Demonstrates a multi-step conversation among 
        ScholarAgent -> FactCheckAgent -> CitationAgent -> ContextAgent, 
        returning a final aggregated result.

        Steps:
          1. The 'User' (simulated) sends user_query to 'ScholarAgent'.
          2. We retrieve ScholarAgent's partial response (which might contain summary/sources).
          3. That partial summary is forwarded to 'FactCheckAgent' to see if it can verify claims.
          4. The FactCheck result is then forwarded to 'CitationAgent' to generate citations 
             for the references or claims discovered.
          5. We finally store or update context in 'ContextAgent'.
          6. Return a final dictionary with all combined data.
        """

        # We'll create a pseudo "User" label
        user_label = "User"
        final_result = {
            "scholar_data": None,
            "factcheck_data": None,
            "citation_data": None,
            "context_data": None
        }

        # STEP 1: user -> ScholarAgent
        # Send user query to ScholarAgent, then get the response
        if "ScholarAgent" not in self.agents:
            return {"error": "ScholarAgent is not registered."}

        scholar_msg_id = self.send_message(
            sender=user_label,
            recipient="ScholarAgent",
            message={"text": user_query}
        )

        scholar_resp = self.get_response("ScholarAgent", timeout=8.0)
        if "error" in scholar_resp:
            return {"error": f"ScholarAgent error: {scholar_resp['error']}"}
        partial_data = scholar_resp["result"]  # e.g. {"summary": "...", "sources": [...], "error": None}
        final_result["scholar_data"] = partial_data

        # STEP 2: scholar -> FactCheckAgent
        # We pass the scholar's summary or partial text to FactCheckAgent to see if there's 
        # anything to verify. 
        if "FactCheckAgent" not in self.agents:
            return final_result  # skip fact check if not present

        summary_text = partial_data.get("summary", "")
        factcheck_msg_id = self.send_message(
            sender="ScholarAgent",
            recipient="FactCheckAgent",
            message={"text": summary_text}  # pass summary as text
        )

        factcheck_resp = self.get_response("FactCheckAgent", timeout=8.0)
        if "error" in factcheck_resp:
            final_result["factcheck_data"] = {"error": factcheck_resp["error"]}
        else:
            final_result["factcheck_data"] = factcheck_resp["result"]

        # STEP 3: factcheck -> CitationAgent
        # Possibly the user wants citations for the newly verified claim or summary
        if "CitationAgent" not in self.agents:
            return final_result

        # If FactCheck gave us some "evaluation" or partial text, we pass it to CitationAgent
        factcheck_text = final_result["factcheck_data"].get("evaluation", "No eval to cite.")
        citation_msg_id = self.send_message(
            sender="FactCheckAgent",
            recipient="CitationAgent",
            message={"text": factcheck_text + " mla"}  # e.g. ask for MLA style citations
        )

        citation_resp = self.get_response("CitationAgent", timeout=8.0)
        if "error" in citation_resp:
            final_result["citation_data"] = {"error": citation_resp["error"]}
        else:
            final_result["citation_data"] = citation_resp["result"]

        # STEP 4: store something in ContextAgent
        # e.g. we store the final user query in context
        if "ContextAgent" in self.agents:
            context_msg_id = self.send_message(
                sender="CitationAgent",
                recipient="ContextAgent",
                message={"text": f"chat_id=advanced_workflow :: {user_query}"}
            )
            context_resp = self.get_response("ContextAgent", timeout=8.0)
            if "error" in context_resp:
                final_result["context_data"] = {"error": context_resp["error"]}
            else:
                final_result["context_data"] = context_resp["result"]

        # Return the aggregated multi-agent result
        return final_result
