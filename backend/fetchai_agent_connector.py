from typing import Dict, Any, Optional, List
from uagents import Agent, Bureau
import uuid

class FetchaiAgentConnector:
    def __init__(self, bureau: Optional[Bureau] = None):
        self.bureau = bureau or Bureau()
        self.agent_registry = {}

    def create_agent_wallet(self) -> Dict[str, Any]:
        agent_name = f"thesys_agent_{uuid.uuid4().hex[:8]}"
        agent = Agent(name=agent_name)
        return {
            'address': agent.address,
            'name': agent_name,
            'agent': agent
        }

    def register_agent_in_agentverse(self, agent_metadata: Dict[str, Any]) -> bool:
        try:
            agent = agent_metadata.get('agent')
            if not agent:
                raise ValueError("No agent provided for registration")
            
            self.bureau.add(agent)
            self.agent_registry[agent.address] = agent_metadata
            return True
        except Exception as e:
            print(f"Agentverse registration error: {e}")
            return False

    def handle_agent_interactions(self, interaction_context: Dict[str, Any]) -> Dict[str, Any]:
        source_agent = interaction_context.get('source_agent')
        target_agent = interaction_context.get('target_agent')
        message = interaction_context.get('message')
        
        if not all([source_agent, target_agent, message]):
            raise ValueError("Incomplete interaction context")
        
        try:
            response = target_agent.send_message(source_agent.address, message)
            return {
                'status': 'success',
                'response': response
            }
        except Exception as e:
            return {
                'status': 'error',
                'error_message': str(e)
            }

    def discover_agents(self, search_criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        matching_agents = []
        for address, agent_info in self.agent_registry.items():
            matches = all(
                agent_info.get(key) == value 
                for key, value in search_criteria.items()
            )
            if matches:
                matching_agents.append({
                    'address': address,
                    **agent_info
                })
        return matching_agents

    def clear_agent_registry(self):
        self.agent_registry.clear()