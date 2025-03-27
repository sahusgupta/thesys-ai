from typing import Dict, Any, Optional
import requests

class AgentDiscoveryService:
    def __init__(self, agentverse_client=None):
        self.agentverse_client = agentverse_client
        self.agent_registry = {}
        self.cached_agents = {}

    def find_specialized_agents(self, research_domain: str) -> Dict[str, Optional[Any]]:
        specialized_agents = {
            'Scholar': None,
            'FactCheck': None,
            'Context': None,
            'Citation': None
        }
        
        if self.agentverse_client:
            try:
                discovered_agents = self.agentverse_client.search_agents(research_domain)
                for agent in discovered_agents:
                    agent_type = self._classify_agent(agent)
                    if agent_type and not specialized_agents[agent_type]:
                        specialized_agents[agent_type] = agent
            except Exception as e:
                print(f"Agentverse discovery error: {e}")
        
        return specialized_agents

    def _classify_agent(self, agent: Any) -> Optional[str]:
        capabilities = self.get_agent_capabilities(agent)
        if 'academic_research' in capabilities:
            return 'Scholar'
        elif 'fact_checking' in capabilities:
            return 'FactCheck'
        elif 'contextual_information' in capabilities:
            return 'Context'
        elif 'citation_generation' in capabilities:
            return 'Citation'
        return None

    def register_agent(self, agent_metadata: Dict[str, Any]):
        agent_id = agent_metadata.get('id')
        if not agent_id:
            raise ValueError("Agent must have a unique identifier")
        
        self.agent_registry[agent_id] = agent_metadata

    def get_agent_capabilities(self, agent: Any) -> Dict[str, Any]:
        if hasattr(agent, 'capabilities'):
            return agent.capabilities
        
        try:
            capabilities_url = agent.get('capabilities_endpoint')
            response = requests.get(capabilities_url)
            return response.json()
        except Exception:
            return {}

    def clear_cache(self):
        self.cached_agents.clear()