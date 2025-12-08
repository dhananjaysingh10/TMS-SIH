from src.triage.neuro_symbolic.triage_engine import TriageEngine
import os

def main():
    # Setup
    data_dir = os.path.abspath("server/ticket-triage-service/Data/Products")
    print(f"Initializing TriageEngine with data from: {data_dir}")
    engine = TriageEngine(data_dir)
    
    product_name = "Product_1" # Based on directory structure we saw
    
    test_cases = [
        # Lexical (Layer A) strong case
        "I cannot register on the portal, my profile is locked.", # 'register' (1.0), 'profile locked' (3.0) -> High score for team_1 (onboarding)
        
        # Semantic (Layer B) strong case
        "I need to change my password but I don't see the option.", # Semantically close to "How do I reset my password..."
        
        # Ambiguous case (Layer C trigger)
        "System is not working properly for bidding." # Vague, might trigger multiple teams
    ]
    
    print("\n--- Running Tests ---")
    for i, ticket in enumerate(test_cases):
        print(f"\nTest {i+1}: '{ticket}'")
        result = engine.classify(ticket, product_name)
        
        print(f"  Assigned Team: {result['assigned_team']}")
        print(f"  Confidence: {result['confidence_score']:.2f}")
        print("  Scores:")
        for team, score in result['details']['combined'].items():
            if score > 0:
                print(f"    {team}: {score:.2f} (A={result['details']['layer_a'].get(team,0)}, B={result['details']['layer_b'].get(team,0):.2f})")

if __name__ == "__main__":
    main()
