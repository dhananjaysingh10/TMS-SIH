"""
Product Detection Module
Detects which product a ticket belongs to based on keywords.
"""

# Product keyword mappings
PRODUCT_KEYWORDS = {
    "Product_1": [  # e-Tendering Portal
        "tender", "bid", "vendor", "dsc", "digital signature", "emd",
        "portal", "registration", "bidding", "rfx", "boq", "powergrid",
        "certificate", "token", "dongle", "signer", "encryption",
        "pranit", "login", "password", "account", "access", "reset"
    ],
    "Product_2": [  # SAP ERP System
        "sap", "t-code", "tcode", "erp", "maintenance order", "maintenance",
        "purchase order", "leave", "salary", "grc", "su01", "su53", 
        "ess", "abap", "teco", "po", "invoice", "grn", "ses",
        "login", "password", "reset", "locked", "unlock", "access"
    ]
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
    text_lower = ticket_text.lower()
    
    scores = {}
    for product, keywords in PRODUCT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        scores[product] = score
    
    # Return product with highest score, default to Product_1
    if max(scores.values()) > 0:
        return max(scores, key=scores.get)
    return "Product_1"


def get_product_name(product_id: str) -> str:
    """
    Get human-readable product name from product folder ID.
    
    Args:
        product_id: Product folder name (e.g., "Product_1")
        
    Returns:
        Human-readable name (e.g., "e-Tendering Portal")
    """
    return PRODUCT_NAMES.get(product_id, product_id)
