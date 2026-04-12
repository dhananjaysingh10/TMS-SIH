"""
Product Detection Module
Detects which product a ticket belongs to based on keywords.
"""

import re

# Product signal mappings with weights.
# Strong, product-specific signals get higher weights; generic words are avoided.
PRODUCT_PATTERNS = {
    "Product_1": [  # e-Tendering Portal
        (r"\be[-\s]?tender(?:ing)?\b", 6),
        (r"\bpranit\b", 6),
        (r"\bpowergrid\b", 5),
        (r"\b(?:rfx|boq|emd|dsc)\b", 5),
        (r"\bdigital\s+signature\b", 5),
        (r"\bvendor\s+(?:registration|onboarding)\b", 5),
        (r"\b(?:tender|bidder|bidding|bid)\b", 4),
        (r"\bportal\b", 2),
        (r"\b(?:dongle|certificate|signer|encryption)\b", 3),
    ],
    "Product_2": [  # SAP ERP System
        (r"\bsap\b", 6),
        (r"\berp\b", 5),
        (r"\b(?:su01|su53|grc|abap|teco|iw31|iw32|iw33|migo|miro|sm37|stms|ess)\b", 6),
        (r"\b(?:goods\s+receipt|grn|account\s+determination|company\s+code)\b", 6),
        (r"\b(?:purchase\s+order|invoice\s+posting|plant\s+maintenance|maintenance\s+order)\b", 5),
        (r"\b(?:salary|leave\s+request)\b", 4),
        (r"\b(?:mm|fi|fico|basis)\b", 4),
        (r"\bpo\b", 2),
    ],
}

# Human-readable product names
PRODUCT_NAMES = {
    "Product_1": "e-Tendering Portal",
    "Product_2": "SAP ERP System"
}


def detect_product(ticket_text: str) -> str:
    """
    Detect which product a ticket belongs to based on keywords.
    
    Args:
        ticket_text: The ticket title and description combined
        
    Returns:
        Product folder name (e.g., "Product_1" or "Product_2")
    """
    text = (ticket_text or "").lower()
    if not text.strip():
        return "General"

    scores = {}
    for product, patterns in PRODUCT_PATTERNS.items():
        score = 0
        for pattern, weight in patterns:
            if re.search(pattern, text):
                score += weight
        scores[product] = score

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    top_product, top_score = ranked[0]
    second_score = ranked[1][1] if len(ranked) > 1 else 0

    # Avoid forcing a product on weak or near-tied generic text.
    if top_score < 3:
        return "General"
    if (top_score - second_score) <= 1 and top_score < 7:
        return "General"

    if top_score > 0:
        return top_product
    return "General"


def get_product_name(product_id: str) -> str:
    """
    Get human-readable product name from product folder ID.
    
    Args:
        product_id: Product folder name (e.g., "Product_1")
        
    Returns:
        Human-readable name (e.g., "e-Tendering Portal")
    """
    if product_id == "General":
        return "General Inquiry"
    return PRODUCT_NAMES.get(product_id, product_id)
