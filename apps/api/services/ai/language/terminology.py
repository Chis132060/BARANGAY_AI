import json
from typing import Dict, List, Set

# Official Barangay terminology mapping to local/Cebuano/Bisaya variants
# This acts as an expansion dictionary for search and intent normalization.
BARANGAY_TERMINOLOGY: Dict[str, List[str]] = {
    "barangay clearance": [
        "clearance",
        "barangay clearance",
        "clearance sa barangay",
        "clrance",
        "clrnc"
    ],
    "certificate of residency": [
        "residency",
        "certificate of residency",
        "residency cert"
    ],
    "business permit": [
        "permit",
        "business permit",
        "business clearance",
        "permit sa negosyo"
    ],
    "fee": [
        "bayad",
        "pabayad",
        "bayranan",
        "gasto",
        "payment",
        "pila",
        "tagpila",
        "how much"
    ],
    "requirements": [
        "requirements",
        "kinahanglan",
        "dad on",
        "dad-on",
        "reqs",
        "need"
    ],
    "location": [
        "asa",
        "asa dapit",
        "asa makuha",
        "where",
        "location",
        "kuhanan"
    ],
    "barangay captain": [
        "captain",
        "kapitan",
        "kap",
        "punong barangay"
    ],
    "kagawad": [
        "kagawad",
        "konsehal",
        "councilor"
    ]
}

def get_official_term(variant: str) -> str:
    """Returns the official term if the variant is recognized."""
    normalized_variant = variant.lower().strip()
    for official, variants in BARANGAY_TERMINOLOGY.items():
        if normalized_variant == official or normalized_variant in variants:
            return official
    return normalized_variant

def expand_query_terms(query: str) -> str:
    """
    Expands a raw query by appending English/Official equivalents 
    if a Cebuano/Bisaya term is detected. This assists the Hybrid Search.
    """
    words = query.lower().split()
    expanded_set: Set[str] = set(words)
    
    # Very naive expansion: if any known variant is in the query, add the official term.
    # A real production system might use NLP tokenization.
    for official, variants in BARANGAY_TERMINOLOGY.items():
        for variant in variants:
            if variant in query.lower():
                expanded_set.add(official)
                
    return " ".join(expanded_set)
