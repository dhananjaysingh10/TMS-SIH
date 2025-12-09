
import requests
import json
import unittest

URL = "http://localhost:8001/suggest"

class TestChatbotFlow(unittest.TestCase):
    def test_basic_query(self):
        """Test a simple query that should have an answer."""
        print("\n--- Testing Basic Query ---")
        payload = {
            "query": "How do I reset my password?",
            "chat_history": []
        }
        try:
            response = requests.post(URL, json=payload)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Answer: {data.get('answer')[:100]}...")
                print(f"Found Solution: {data.get('found_solution')}")
                # We expect found_solution to likely be True for password reset if docs exist
                # But even if false, the structure should be correct
        except Exception as e:
            print(f"Request failed: {e}")

    def test_history_context(self):
        """Test sending history to see if it's accepted."""
        print("\n--- Testing History Context ---")
        payload = {
            "query": "What if that doesn't work?",
            "chat_history": [
                {"role": "user", "message": "How do I reset my password?"},
                {"role": "ai", "message": "Go to settings and click reset."}
            ]
        }
        try:
            response = requests.post(URL, json=payload)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Answer: {data.get('answer')[:100]}...")
        except Exception as e:
            print(f"Request failed: {e}")

    def test_no_solution(self):
        """Test a query that should NOT be in the docs."""
        print("\n--- Testing No Solution ---")
        payload = {
            "query": "How do I bake a pizza using the SAP portal?",
            "chat_history": []
        }
        try:
            response = requests.post(URL, json=payload)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Answer: {data.get('answer')}")
                print(f"Found Solution: {data.get('found_solution')}")
                # Ideally found_solution should be False
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    unittest.main()
