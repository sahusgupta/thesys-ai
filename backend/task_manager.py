from typing import List, Dict, Any
from agents.agent import ScholarAgent, FactCheckAgent, ContextAgent, CitationAgent
from agent_communication import AgentCommunicationProtocol
from search_discovery import AgentDiscoveryService
from vector_storage import VectorKnowledgeBase
from fetchai_agent_connector import FetchaiAgentConnector

class ThesysOrchestrator:
    def __init__(self, agents: List[Any], agentverse_client=None):
        self.agents = {type(agent).__name__: agent for agent in agents}
        self.communication_protocol = AgentCommunicationProtocol(agents)
        self.discovery_service = AgentDiscoveryService(agentverse_client)
        self.knowledge_base = VectorKnowledgeBase()
        self.agent_connector = FetchaiAgentConnector()
        self.workflow_cache = {}

    def execute_research_workflow(self, research_query: str) -> Dict[str, Any]:
        workflow_id = hash(research_query)
        
        if workflow_id in self.workflow_cache:
            return self.workflow_cache[workflow_id]
        
        specialized_agents = self._route_query_to_agents(research_query)
        
        results = {}
        for agent_type, agent in specialized_agents.items():
            try:
                agent_result = agent.process_query(research_query)
                results[agent_type] = agent_result
            except Exception as e:
                results[agent_type] = {'error': str(e)}
        
        validated_results = self._validate_agent_responses(results)
        final_report = self._generate_final_report(validated_results)
        
        self.workflow_cache[workflow_id] = final_report
        return final_report

    def _route_query_to_agents(self, query: str) -> Dict[str, Any]:
        routing_map = {
            'Scholar': self.agents.get('ScholarAgent'),
            'FactCheck': self.agents.get('FactCheckAgent'),
            'Context': self.agents.get('ContextAgent'),
            'Citation': self.agents.get('CitationAgent')
        }
        
        search_results = self.discovery_service.find_specialized_agents(query)
        for agent_type, additional_agent in search_results.items():
            if additional_agent:
                routing_map[agent_type] = additional_agent
        
        return routing_map

    def _validate_agent_responses(self, responses: Dict[str, Any]) -> Dict[str, Any]:
        validated_results = {}
        for agent_type, response in responses.items():
            if not response.get('error'):
                cross_verified = self.agents['FactCheckAgent'].verify_information(response)
                validated_results[agent_type] = cross_verified
        
        return validated_results

    def _generate_final_report(self, synthesized_data: Dict[str, Any]) -> Dict[str, Any]:
        report = {
            'summary': '',
            'citations': [],
            'sources': []
        }
        
        for agent_type, data in synthesized_data.items():
            if agent_type == 'Scholar':
                report['summary'] = data.get('summary', '')
                report['sources'] = data.get('sources', [])
            elif agent_type == 'Citation':
                report['citations'] = data.get('citations', [])
        
        return report

    def clear_workflow_cache(self):
        self.workflow_cache.clear()