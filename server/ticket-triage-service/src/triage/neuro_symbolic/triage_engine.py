import os
import glob
import re
import json
import logging
import requests
import nltk
import numpy as np
from typing import List, Dict, Tuple, Any

# Ensure NLTK data (lite version)
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')
    nltk.download('wordnet')
    nltk.download('omw-1.4') # For lemmatizer

from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from fastembed import TextEmbedding

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TriageEngine:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.teams_db = {} # {product: {team: {keywords: [], errors: [], queries: []}}}
        
        # NLP tools
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
        
        # Load Data
        self.load_data()
        
        # Initialize Embeddings (Lazy or Eager)
        self.embedding_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        # Pre-compute query embeddings for Layer B
        self.team_query_embeddings = {} # {product: {team: [vectors]}}
        self._precompute_embeddings()

    def load_data(self):
        """Parses the team_*.txt files into teams_db structure."""
        logger.info(f"Loading data from {self.data_dir}")
        product_dirs = glob.glob(os.path.join(self.data_dir, "Product_*"))
        
        for p_dir in product_dirs:
            product_name = os.path.basename(p_dir)
            self.teams_db[product_name] = {}
            
            # Find team directories
            team_dirs = glob.glob(os.path.join(p_dir, "team_*"))
            for t_dir in team_dirs:
                team_name = os.path.basename(t_dir)
                txt_file = os.path.join(t_dir, f"{team_name}.txt")
                
                if os.path.exists(txt_file):
                    parsed_data = self._parse_team_file(txt_file)
                    self.teams_db[product_name][team_name] = parsed_data
                else:
                    logger.warning(f"No text file found for {team_name} at {txt_file}")

        logger.info("Data loading complete.")

    def _parse_team_file(self, filepath: str) -> Dict[str, Any]:
        """Parses a single key=[value] formatted file."""
        # Default name is the folder name
        folder_name = os.path.basename(os.path.dirname(filepath))
        data = {
            "name": folder_name,  # Real team name (will be overridden if name= exists)
            "keywords": [],
            "errors": [],
            "queries": []
        }
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse team name (e.g., name=Vendor Onboarding & Reg)
            name_match = re.search(r'name=(.+?)\n', content)
            if name_match:
                data["name"] = name_match.group(1).strip()
            
            # Primary matches
            primary_match = re.search(r'primary=\[(.*?)\]', content, re.DOTALL)
            if primary_match:
                raw_primary = primary_match.group(1)
                items = [item.strip().strip('"').strip("'") for item in raw_primary.split(',') if item.strip()]
                data["keywords"].extend(items)

            # Technical matches
            tech_match = re.search(r'technical=\[(.*?)\]', content, re.DOTALL)
            if tech_match:
                raw_tech = tech_match.group(1)
                items = [item.strip().strip('"').strip("'") for item in raw_tech.split(',') if item.strip()]
                data["keywords"].extend(items)

            # Error matches
            error_match = re.search(r'error=\[(.*?)\]', content, re.DOTALL)
            if error_match:
                raw_error = error_match.group(1)
                items = [item.strip().strip('"').strip("'") for item in raw_error.split(',') if item.strip()]
                data["errors"].extend(items)

            # Query matches
            queries_match = re.search(r'sample_queries=\[(.*?)\]', content, re.DOTALL)
            if queries_match:
                raw_queries = queries_match.group(1)
                raw_queries = raw_queries.replace('”', '"').replace('“', '"')
                matches = re.findall(r'"([^"]*)"', raw_queries)
                if not matches and raw_queries.strip():
                     matches = [q.strip() for q in raw_queries.split(',') if q.strip()]
                data["queries"].extend(matches)
                
        except Exception as e:
            logger.error(f"Error parsing {filepath}: {e}")
            
        return data

    def _precompute_embeddings(self):
        """Computes embeddings for all sample queries in Layer B."""
        logger.info("Pre-computing Layer B embeddings...")
        for product, teams in self.teams_db.items():
            self.team_query_embeddings[product] = {}
            for team, data in teams.items():
                if data["queries"]:
                    embeddings = list(self.embedding_model.embed(data["queries"]))
                    self.team_query_embeddings[product][team] = embeddings
                else:
                    self.team_query_embeddings[product][team] = []
        logger.info("Embeddings done.")

    def preprocess(self, text: str) -> List[str]:
        """Tokenize, lower, remove stopwords, lemmatize."""
        text = text.lower()
        tokens = word_tokenize(text)
        clean_tokens = []
        for token in tokens:
            if token.isalnum() and token not in self.stop_words:
                lemma = self.lemmatizer.lemmatize(token)
                lemma = self.lemmatizer.lemmatize(lemma, pos='v') 
                clean_tokens.append(lemma)
        return clean_tokens

    def layer_a_lexical_score(self, ticket_text: str, product: str) -> Dict[str, float]:
        """
        Layer A: Exact/Fuzzy keyword matching.
        Score = (Keyword Matches * 1.0) + (Error Matches * 3.0)
        """
        if product not in self.teams_db:
            return {}

        scores = {team: 0.0 for team in self.teams_db[product]}
        ticket_lower = ticket_text.lower()
        
        for team, data in self.teams_db[product].items():
            # Check Keywords (1.0)
            for kw in data["keywords"]:
                normalized_kw = kw.lower()
                if normalized_kw in ticket_lower:
                    scores[team] += 1.0
            
            # Check Errors (3.0)
            for err in data["errors"]:
                normalized_err = err.lower()
                if normalized_err in ticket_lower:
                    scores[team] += 3.0
                    
        return scores

    def layer_b_semantic_score(self, ticket_text: str, product: str) -> Dict[str, float]:
        """
        Layer B: Semantic Similarity.
        1. Embed ticket.
        2. Compare with pre-computed query vectors for each team.
        3. Score = Cosine Similarity of top match.
        """
        if product not in self.teams_db:
            return {}
            
        scores = {team: 0.0 for team in self.teams_db[product]}
        
        # Embed ticket
        try:
            ticket_embedding = list(self.embedding_model.embed([ticket_text]))[0]
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return scores
            
        for team, team_vectors in self.team_query_embeddings.get(product, {}).items():
            if not team_vectors:
                continue
                
            matrix = np.array(team_vectors)
            dot_products = np.dot(matrix, ticket_embedding)
            
            if len(dot_products) > 0:
                max_similarity = np.max(dot_products)
                scores[team] = float(max_similarity)
                
        return scores

    def layer_c_llm_judge(self, ticket_text: str, candidates: List[Tuple[str, float]]) -> str:
        """
        Layer C: Gemma 4b Re-ranker.
        Called when confidence is low or multiple teams have similar scores.
        candidates: List of (team, score) tuples.
        """
        candidate_str = ", ".join([f"{c[0]} (Score: {c[1]:.2f})" for c in candidates])
        
        prompt = f'''You are a Ticket Triage Expert. 
Classify the following IT Support ticket into one of these teams: {candidate_str}.
Return ONLY the Team Name.

TICKET: "{ticket_text}"

Reasoning:
1. Analyze the issue.
2. Match it to the most relevant team from the list.

FINAL DECISION (Team Name Only):'''

        try:
            print(f"\n🤖 LAYER C: Calling Gemma LLM...", flush=True)
            response = requests.get("http://172.17.0.168:5001/ask", params={"q": prompt}, timeout=15)
            if response.status_code == 200:
                llm_output = response.text.strip()
                print(f"🤖 LAYER C: Gemma Response: {llm_output[:150]}...", flush=True)
                assigned_team = llm_output.split('\n')[-1].strip()
                
                valid_teams = {c[0] for c in candidates}
                for vt in valid_teams:
                    if vt.lower() in assigned_team.lower():
                        print(f"🤖 LAYER C: Gemma picked → {vt}", flush=True)
                        return vt
                        
                print(f"🤖 LAYER C: Gemma unclear, falling back to {candidates[0][0]}", flush=True)
                return candidates[0][0]
            else:
                print(f"🤖 LAYER C: Gemma returned status {response.status_code}", flush=True)
        except Exception as e:
            print(f"🤖 LAYER C: Gemma error - {e}", flush=True)
            logger.error(f"LLM Error: {e}")
            
        return candidates[0][0]

    def classify(self, ticket_text: str, product: str) -> Dict[str, Any]:
        """
        Main Classification Pipeline.
        """
        # Layer A
        scores_a = self.layer_a_lexical_score(ticket_text, product)
        
        # Layer B
        scores_b = self.layer_b_semantic_score(ticket_text, product)
        
        # Combine
        final_scores = {}
        all_teams = set(scores_a.keys()) | set(scores_b.keys())
        
        for team in all_teams:
            s_a = scores_a.get(team, 0.0)
            s_b = scores_b.get(team, 0.0) * 5.0 # Weight semantic matches heavily
            final_scores[team] = s_a + s_b

        sorted_teams = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
        top_team, top_score = sorted_teams[0] if sorted_teams else ("Unknown", 0.0)
        
        # Decision Logic for Layer C
        # ALWAYS run Layer C for demonstration
        run_layer_c = True
        candidates = sorted_teams[:3]  # Top 3 candidates
        
        final_decision = top_team
        
        if run_layer_c:
            logger.info(f"Triggering Layer C (Gemma). Top candidates: {candidates}")
            final_decision = self.layer_c_llm_judge(ticket_text, candidates)
            
        # Get the real team name from teams_db
        team_data = self.teams_db.get(product, {}).get(final_decision, {})
        real_team_name = team_data.get("name", final_decision) if team_data else final_decision
        
        return {
            "assigned_team": real_team_name,  # Real team name (e.g., "Vendor Onboarding & Reg")
            "assigned_team_id": final_decision,  # Folder name (e.g., "team_1")
            "confidence_score": top_score,
            "details": {
                "layer_a": scores_a,
                "layer_b": scores_b,
                "combined": final_scores
            }
        }
