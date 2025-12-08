import requests
import json
import os


QUERY = "How do I do vendor registration?"


SERVER_URL = "http://localhost:8001/suggest"
# Always save to the root of the workspace
OUTPUT_FILE = "/Users/thisisaman408/TMS-SIH/output.txt"

def main():
    print(f"🚀 Sending Query: '{QUERY}'")
    
    try:
        response = requests.post(
            SERVER_URL,
            json={"query": QUERY},
            headers={"Content-Type": "application/json"},
            timeout=300
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Formatted Output
            separator = "=" * 80
            output_text = f"""
{separator}
🔎 QUERY: {QUERY}
{separator}

🤖 ANSWER:
{data.get('answer', 'No answer provided.')}

📚 CONTEXT USED ({len(data.get('context_used', []))} chunks):
"""
            for i, ctx in enumerate(data.get('context_used', [])):
                output_text += f"\n--- Chunk {i+1} ---\n{ctx.strip()}\n"
            
            output_text += f"\n{separator}\n\n"

            # Print to Console
            print(output_text)
            
            # Save to File
            with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
                f.write(output_text)
            
            print(f"✅ Output saved to {os.path.abspath(OUTPUT_FILE)}")
            
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    main()
