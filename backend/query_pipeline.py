from models.summarization import generate_summary, filter_sentences
import nltk
import re
from typing import Union, List

def chunk_text(text: str, chunk_size: int = 1000) -> List[str]:

    sentences = nltk.sent_tokenize(text)
    chunks = []
    current_chunk = []
    current_word_count = 0
    
    for sentence in sentences:
        sentence_words = len(re.findall(r'\b\w+\b', sentence))

        if current_word_count + sentence_words > chunk_size and current_chunk:
            chunks.append(' '.join(current_chunk))
            current_chunk = []
            current_word_count = 0
        
        current_chunk.append(sentence)
        current_word_count += sentence_words
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    return chunks

def merge_summaries(summaries: List[dict]) -> dict:

    if not summaries:
        return {'Error': 'No summaries to merge'}
    
    merged = summaries[0].copy()
    
    for summary in summaries[1:]:
        for key, value in summary.items():
            if key in merged:
                combined = merged[key] + " " + value
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

def preprocess(text: str) -> Union[str, list]:
 
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

def summarize():
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
        chunks = chunk_text(text)
        
        chunk_summaries = []
        for chunk in chunks:
            cleaned_chunk = preprocess(chunk)
            chunk_summary = generate_summary(cleaned_chunk, prompt, discipline)
            chunk_summaries.append(chunk_summary)
        
        summary = merge_summaries(chunk_summaries)
    else:
        cleaned_text = preprocess(text)
        summary = generate_summary(cleaned_text, prompt, discipline)
    
    return filter_sentences(summary)