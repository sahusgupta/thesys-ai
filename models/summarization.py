import openai as oa
import os
import nltk
from typing import Union
# Load OpenAI API key
client = oa.Client()
client.api_key = os.getenv('OPENAI_API_KEY')
 
def generate_summary(text: str, prompt, discipline) -> dict:
    structure = "Title of the Paper:&delete \
                Key Findings:&delete \
                Methodology:&delete \
                Contradictions:&delete \
                Additional Notes:&delete \
                Gaps in literature:&delete "
    response = client.chat.completions.create(model="gpt-4o",
                                              max_completion_tokens=1000,
                                              temperature=0.5,
                                              messages=[{'role': 'assistant', 
                                                         'content': 
                                                             f'You are a specialized research assistant tasked with summarizing articles and existing papers and extracting the most \
                                                                valuable and relevant information to a given topic. Given that the user\'s inquiry handles {prompt} in the field of {discipline}, \
                                                                generate a comprehensive and evaluative summary of the following literature, returning your summary in the following structure: {structure}\
                                                                DO NOT modify the :&delete combination, it is for post processing. Your response must contain all 6 sections, complete with the section title \
                                                                and the corresponding information, and must not exceed the token limit. Ensure all of your information included in the response is drawn directly \
                                                                from the text and all prior context, do not pull new information from other sources.'
                                                        }]
                                              )
    if response.choices and response.choices[0]['content']:
        content = response.choices[0]['content'].strip().split(':&delete')
        summary = {i: j for i, j in content}
        return summary
    else:
        return {'Error': 'Failed to generate summary'}

def clean(text: str) -> Union[str, list]:
    tokens = nltk.word_tokenize(text)
    tokens = [token for token in tokens if token.isalnum()]
    stop_words = set(nltk.corpus.stopwords.words('english'))
    tokens = [token for token in tokens if token.lower() not in stop_words]
    text = ' '.join(tokens)
    if len(tokens) > 4096:
        agg = []
        for i in range(0, len(tokens), 4096):
            agg.append(tokens[i:i+4096])
            return agg
    return text