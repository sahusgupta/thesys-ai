import openai as oa
import os
import nltk
import re
from typing import Union, List
# Load OpenAI API key
client = oa.Client()
# Strip any whitespace or newline characters from the API key
api_key = os.getenv('OPENAI_API_KEY')
if api_key:
    api_key = api_key.strip()
client.api_key = api_key
# Download required NLTK resources
nltk.download('stopwords')
nltk.download('punkt')

def chunk_text(text: str, chunk_size: int = 1000) -> List[str]:
    """
    Break large text into smaller chunks of approximately chunk_size words.
    Ensures chunks end at sentence boundaries.
    
    Args:
        text: The input text to be chunked
        chunk_size: Target number of words per chunk (default: 1000)
        
    Returns:
        List of text chunks
    """
    # Split text into sentences
    sentences = nltk.sent_tokenize(text)
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    for sentence in sentences:
        # Count words in the sentence
        sentence_words = len(re.findall(r'\b\w+\b', sentence))
        
        # If adding this sentence would exceed chunk size and we already have content,
        # finalize the current chunk and start a new one
        if current_word_count + sentence_words > chunk_size and current_chunk:
            chunks.append(' '.join(current_chunk))
            current_chunk = []
            current_word_count = 0
        
        # Add the sentence to the current chunk
        current_chunk.append(sentence)
        current_word_count += sentence_words
    
    # Add the last chunk if it has content
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def merge_summaries(summaries: List[dict]) -> dict:
    """
    Merge multiple summary dictionaries, removing redundancies.
    
    Args:
        summaries: List of summary dictionaries to merge
        
    Returns:
        Merged summary dictionary
    """
    if not summaries:
        return {'Error': 'No summaries to merge'}
    
    # Initialize with the first summary
    merged = summaries[0].copy()
    
    # Merge the rest
    for summary in summaries[1:]:
        for key, value in summary.items():
            if key in merged:
                # Combine values and remove redundancies
                combined = merged[key] + " " + value
                # Simple deduplication by splitting into sentences and removing duplicates
                sentences = nltk.sent_tokenize(combined)
                unique_sentences = []
                for sentence in sentences:
                    sentence = sentence.strip()
                    if sentence and not any(sentence in s for s in unique_sentences):
                        unique_sentences.append(sentence)
                merged[key] = ' '.join(unique_sentences)
            else:
                merged[key] = value
    
    return merged

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
                                                                statements, you must maximize the valuable insight drawn from data-driven analysis, ensure maximum information. Text: {text}'
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

def clean(text: str) -> Union[str, list]:
    # Use a simple regex-based tokenization instead of nltk.word_tokenize
    # This avoids the dependency on punkt_tab
    tokens = re.findall(r'\b\w+\b', text)
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

def pipeline():
    discipline = "Computer Science (AI / Deep Learning)"
    prompt = "A multiple-path gradient projection method for solving the logit-based stochastic user equilibrium model?"

    text = """
        Title: The Role of Artificial Intelligence in Modern Healthcare

        Abstract:
        Artificial Intelligence (AI) has become an integral part of modern healthcare, revolutionizing diagnostics, treatment planning, and patient management. This paper explores the current applications, advantages, and challenges of AI in the medical field. AI-driven technologies such as deep learning, natural language processing, and predictive analytics have enhanced clinical decision-making and improved patient outcomes. The study also discusses the ethical and regulatory concerns associated with AI deployment in healthcare.

        Introduction:
        The integration of artificial intelligence in healthcare has transformed traditional medical practices. AI systems are being used to analyze complex medical data, support diagnostic procedures, and personalize patient treatment. As AI technology advances, its applications in disease prediction, radiology, and robotic-assisted surgery continue to expand. However, ethical considerations, data privacy issues, and the potential for algorithmic biases must be carefully addressed to ensure equitable healthcare delivery.

        Applications of AI in Healthcare:
        1. **Medical Imaging and Diagnostics**:
        - AI-powered radiology tools have improved the accuracy of detecting anomalies in X-rays, MRIs, and CT scans. 
        - Deep learning algorithms analyze imaging data to identify diseases such as cancer, cardiovascular conditions, and neurological disorders.
        - AI systems provide automated image interpretation, reducing workload for radiologists.

        2. **Personalized Medicine and Predictive Analytics**:
        - AI enables precision medicine by analyzing patient genetics, lifestyle, and medical history to recommend tailored treatments.
        - Predictive analytics models assess risk factors and forecast disease progression.
        - Machine learning algorithms optimize drug discovery by analyzing biochemical data.

        3. **AI in Surgery and Robotics**:
        - Robotic-assisted surgical systems, such as the Da Vinci Surgical System, enhance surgical precision and reduce recovery times.
        - AI-powered robots assist in minimally invasive procedures, reducing human error.
        - Autonomous surgical robots are being developed to perform complex surgeries with minimal human intervention.

        4. **Electronic Health Records (EHR) and Natural Language Processing (NLP)**:
        - NLP techniques process unstructured medical records, extracting critical patient information.
        - AI-driven EHR systems streamline data entry, reduce administrative burden, and enhance physician efficiency.
        - Chatbots assist in patient communication and preliminary symptom assessment.

        Challenges and Ethical Considerations:
        1. **Data Privacy and Security**:
        - AI systems require access to large volumes of patient data, raising concerns about data security and patient confidentiality.
        - Cybersecurity threats pose risks to AI-driven healthcare applications.
        - Regulations such as HIPAA and GDPR aim to safeguard sensitive health information.

        2. **Algorithmic Bias and Ethical Dilemmas**:
        - Biases in AI training data can lead to disparities in diagnosis and treatment recommendations.
        - AI models must be trained on diverse datasets to ensure fairness and equity in healthcare.
        - Ethical frameworks should guide AI deployment to prevent discrimination and ensure transparency.

        3. **Regulatory and Legal Challenges**:
        - AI-driven medical devices and software require regulatory approval to ensure safety and efficacy.
        - Policymakers must establish guidelines for AI use in clinical practice.
        - Liability concerns arise when AI-based recommendations lead to medical errors.

        Future Directions and Conclusion:
        The future of AI in healthcare is promising, with continuous advancements in deep learning, genomics, and robotics. AI-driven solutions have the potential to bridge gaps in global healthcare accessibility, particularly in remote and underserved areas. Collaboration between healthcare professionals, AI developers, and policymakers is essential to harness AI's full potential while addressing ethical and regulatory challenges. As AI technology evolves, its integration into modern healthcare systems will continue to enhance patient care and drive medical innovation.

        References:
        1. Topol, E. J. (2019). Deep Medicine: How Artificial Intelligence Can Make Healthcare Human Again. Basic Books.
        2. Jiang, F., Jiang, Y., Zhi, H., Dong, Y., Li, H., Ma, S., ... & Wang, Y. (2017). Artificial intelligence in healthcare: past, present, and future. Stroke and vascular neurology, 2(4), 230-243.
        3. Rajpurkar, P., Irvin, J., Zhu, K., Yang, B., Mehta, H., Duan, T., ... & Ng, A. Y. (2017). CheXNet: Radiologist-Level Pneumonia Detection on Chest X-Rays with Deep Learning. arXiv preprint arXiv:1711.05225.
        4. Patel, V. L., Shortliffe, E. H., Stefanelli, M., Szolovits, P., Berthold, M. R., Bellazzi, R., & Abu-Hanna, A. (2009). The coming of age of artificial intelligence in medicine. Artificial Intelligence in medicine, 46(1), 5-17.
        """
    
    # Check if text needs chunking (over 1000 words)
    word_count = len(re.findall(r'\b\w+\b', text))
    
    if word_count > 1000:
        # Chunk the text
        chunks = chunk_text(text)
        
        # Process each chunk
        chunk_summaries = []
        for chunk in chunks:
            cleaned_chunk = clean(chunk)
            chunk_summary = generate_summary(cleaned_chunk, prompt, discipline)
            chunk_summaries.append(chunk_summary)
        
        # Merge the summaries
        summary = merge_summaries(chunk_summaries)
    else:
        # Process as a single chunk
        cleaned_text = clean(text)
        summary = generate_summary(cleaned_text, prompt, discipline)
    
    return summary

if __name__ == "__main__":
    print(pipeline())