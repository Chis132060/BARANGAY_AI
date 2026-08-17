import re

def detect_language(query: str) -> str:
    """
    Fast, heuristic-based language detection.
    Maps known user descriptions (Bisaya, Binisaya) and vocabulary to an internal code.
    Supported codes: 'en', 'ceb', 'mixed'
    """
    query_lower = query.lower()
    
    cebuano_keywords = {
        "unsa", "asa", "pila", "kinsa", "kanus-a", "ngano", 
        "ug", "sa", "ang", "mga", "nga", "para", "ako", "nako", "nimo",
        "kinahanglan", "bayad", "kuha", "makuha", "pwede", "dapit"
    }
    
    english_keywords = {
        "what", "where", "how", "who", "when", "why",
        "and", "the", "for", "to", "is", "are", "do", "can",
        "require", "requirement", "fee", "payment", "get", "apply"
    }
    
    words = set(re.findall(r'\b\w+\b', query_lower))
    
    ceb_count = len(words.intersection(cebuano_keywords))
    en_count = len(words.intersection(english_keywords))
    
    # If the user explicitly asks to speak in a language
    if "bisaya" in query_lower or "cebuano" in query_lower or "binisaya" in query_lower:
        return "ceb"
        
    if ceb_count > 0 and en_count > 0:
        return "mixed"
    elif ceb_count > en_count:
        return "ceb"
    elif en_count > ceb_count:
        return "en"
    
    # Default fallback
    return "ceb" if ceb_count > 0 else "en"
