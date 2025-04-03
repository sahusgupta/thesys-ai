import openai as oa
import os
import nltk
import re
from typing import Union, List
import yake
from utils.config import Config
# Load OpenAI API key
client = oa.Client()
# Strip any whitespace or newline characters from the API key
api_key = Config.OPENAI_API_KEY
if api_key:
    api_key = api_key.strip()
client.api_key = api_key
# Download required NLTK resources
nltk.download('stopwords')
nltk.download('punkt')

def generate_summary(text: str, prompt, discipline) -> dict:
    structure = "Title of the Paper:&delete \
                Research Question (What was the primary focus of research?):&delete \
                Key Findings (What were the main findings?):&delete \
                Methodology (How was the research conducted?):&delete \
                Contradictions (Analyze the paper fully. Are there any shortcomings or flaws that need to be addressed?):&delete \
                Additional Notes (What other information is relevant?):&delete \
                Gaps in literature (How can the user improve the field through their research based on the subject matter provided?):&delete "
    response = client.chat.completions.create(model="gpt-4o",
                                              max_tokens=1500,
                                              temperature=0.3,
                                              messages=[{'role': 'assistant', 
                                                         'content': 
                                                             f'You are a specialized research assistant tasked with summarizing articles and existing papers and extracting the most \
                                                                valuable and relevant information to a given topic. Given that the inquiry handles {prompt} in the field of {discipline}, \
                                                                generate a comprehensive and evaluative summary of the following literature, returning your summary in the following structure: {structure}\
                                                                DO NOT modify the :&delete combination, it is for post processing. Your response must contain all 6 sections, complete with the section title \
                                                                and the corresponding information, and must not exceed the token limit. Ensure all of your information included in the response is drawn directly \
                                                                from the text and all prior context, do not pull new information from other sources. avoid wasting tokens on stopwords and common introductory \
                                                                statements, you must maximize the valuable insight drawn from data-driven analysis, ensure maximum information. Text: {text}. \
                                                                Your objective is to maximize the value and information density provided in your response and preserve the numerical findings and significant statistics, hence avoid sentence starters and overtly flowery diction, simply focus on the category that is being discussed. \
                                                                For further guidance, refer to the following process when composing your summary, provided that you have already read the paper once. On the second read, follow these steps. \
                                                                Step 1: Identify the research question. \
                                                                Step 2: Understand the context of the topic and the central argument or focus of the study. \
                                                                Step 3: Gather contextual evidence from the literature examination done throughout the paper. \
                                                                Step 4: Begin clumping evidence and findings into categories: Supporting initial hypothesis, contradicting initial hypothesis, contextualizing research situation. \
                                                                Step 5: Evaluate how the methodology used in the research could possibly lead to inconsistencies, or if there are holes in the research that must be addressed \
                                                                Step 6: Summarize the key findings and methodology in a way that is easy to understand and relate to the research question. \
                                                                Avoid using any of the following colloquialisms of AI speech: \
                                                                - This research explores... \
                                                                - Many studies have investigated this topic \
                                                                - Over the years, this field has seen significant changes \
                                                                - provides a comprehensive overview of... \
                                                                - any overly general, vague or redundant findings \
                                                                - an overreliance on qualifiers that are not supported by specific data.'
                                                        }]
                                              )
    if response.choices and len(response.choices) > 0:
        content = response.choices[0].message.content.strip().split(':&delete')
        summary_dict = {}
        for i in range(len(content) - 1):
            key = content[i].split('\n')[-1].strip()
            value = content[i + 1].split('\n')[0].strip()
            summary_dict[key] = value
        return summary_dict
    else:
        return {'Error': 'Failed to generate summary'}

def extract_keywords(text):
    extractor = yake.KeywordExtractor(n=2, top=10)
    keywords = extractor.extract_keywords(text)
    return [keyword[0] for keyword in keywords]

def filter_sentences(summary):
    sentences = summary.split(". ")
    keywords = extract_keywords(summary)
    filtered_sentences = [sentence for sentence in sentences if any(keyword.lower() in sentence.lower() for keyword in keywords)]
    return ". ".join(filtered_sentences)

if __name__ == "__main__":
    print(())