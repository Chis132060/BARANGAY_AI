def build_language_instruction(detected_language: str) -> str:
    """
    Generates a prompt instruction to force the LLM to output in the detected language.
    Does not allow the LLM to assume a language based on retrieved English documents.
    """
    if detected_language == "ceb":
        return "CRITICAL: You MUST answer strictly in Cebuano/Bisaya. Do NOT answer in English, even if the provided context is in English."
    elif detected_language == "mixed":
        return "CRITICAL: You may answer in a natural mix of Cebuano and English (Bislish), matching the conversational tone of the user."
    else:
        return "CRITICAL: You MUST answer strictly in English."
