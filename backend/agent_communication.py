from typing import List, Any, Dict
import uuid
from queue import Queue
import threading

class AgentCommunicationProtocol:
    def __init__(self, agents: List[Any]):
        self.agents = {type(agent).__name__: agent for agent in agents}
        self.message_queues = {agent_type: Queue() for agent_type in self.agents}
        self.response_queues = {agent_type: Queue() for agent_type in self.agents}
        self._start_message_handlers()

    def _start_message_handlers(self):
        for agent_type in self.agents:
            threading.Thread(
                target=self._message_handler, 
                args=(agent_type,), 
                daemon=True
            ).start()

    def _message_handler(self, agent_type):
        while True:
            message = self.message_queues[agent_type].get()
            try:
                agent = self.agents[agent_type]
                response = agent.process_message(message)
                self.response_queues[agent_type].put(response)
            except Exception as e:
                self.response_queues[agent_type].put({
                    'error': str(e),
                    'message_id': message.get('id')
                })

    def send_message(self, sender: str, recipient: str, message: Dict[str, Any]) -> str:
        message_id = str(uuid.uuid4())
        full_message = {
            'id': message_id,
            'sender': sender,
            'content': message,
            'timestamp': threading.get_ident()
        }
        
        if recipient not in self.message_queues:
            raise ValueError(f"Recipient {recipient} not found")
        
        self.message_queues[recipient].put(full_message)
        return message_id

    def broadcast_message(self, sender: str, message: Dict[str, Any]) -> List[str]:
        message_ids = []
        for recipient in self.agents:
            if recipient != sender:
                message_id = self.send_message(sender, recipient, message)
                message_ids.append(message_id)
        return message_ids

    def get_response(self, agent_type: str, timeout: float = 5.0) -> Dict[str, Any]:
        try:
            return self.response_queues[agent_type].get(timeout=timeout)
        except Exception:
            return {'error': 'No response received'}

    def clear_queues(self):
        for queue in list(self.message_queues.values()) + list(self.response_queues.values()):
            while not queue.empty():
                queue.get()