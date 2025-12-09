import re

def format_response_to_markdown(text: str) -> str:
    """
    Post-processes raw LLM output to be clean, structured Markdown.
    
    Rules applied:
    1. Bold "Method X:", "Step X:", "Important Notes:", etc. if not already bold.
    2. Ensure proper spacing for bullet points and numbered lists.
    3. Convert "Click on X" patterns to bold if they seem like UI elements.
    4. Remove excessive newlines.
    """
    if not text:
        return ""

    # 1. Bold Headers (Method 1:, Step 1:, Important Notes:)
    # Looks for lines starting with these patterns that aren't already bold
    # Regex explains: Start of line or newline, optional *, Text, optional *, Colon
    
    # Pattern: "Method 1: ..." -> "**Method 1:** ..."
    text = re.sub(r'(?m)^(\s*)(Method \d+|Step \d+|Note|Important Notes?|Warning|Tip):', r'\1**\2:**', text)
    
    # Pattern: "* Method 1:" -> "**Method 1:**" (fix existing weak formatting)
    text = re.sub(r'(?m)^(\s*)\*\s*(Method \d+|Step \d+):', r'\1**\2:**', text)
    
    # 2. Format Lists
    # Ensure numbered lists have a space after the dot: "1.Step" -> "1. Step"
    text = re.sub(r'(?m)^(\d+)\.([^\s])', r'\1. \2', text)
    
    # Ensure bullet points have a space: "*Item" -> "* Item"
    text = re.sub(r'(?m)^(\s*)\*([^\s\*])', r'\1* \2', text)
    
    # 3. Bold Key UI Elements (heuristics)
    # "Click on Submit Button" -> "Click on **Submit Button**"
    # Matches "Click on X Button" or "Click on X Link"
    def bold_ui_element(match):
        prefix = match.group(1)
        element = match.group(2)
        return f"{prefix} **{element}**"
    
    text = re.sub(r'(Click on|Select the) ([A-Z][a-zA-Z0-9\s]+ (Button|Link|Checkbox|Icon|Tab))', bold_ui_element, text)
    
    # 4. Clean up whitespace
    # Replace 3+ newlines with 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 5. Fix "Status: x" lines to be bold
    text = re.sub(r'(?m)^(Status|Priority|Ticket ID):', r'**\1:**', text)
    
    return text.strip()
