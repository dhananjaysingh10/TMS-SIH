import glob
import logging
import os
import re
from typing import Any, Dict, List, Tuple

import nltk
import numpy as np
from fastembed import TextEmbedding
from groq import Groq
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

from ..config import settings

# Ensure NLTK data (lite version)
try:
    nltk.data.find("tokenizers/punkt")
    nltk.data.find("corpora/stopwords")
    nltk.data.find("corpora/wordnet")
except LookupError:
    nltk.download("punkt")
    nltk.download("stopwords")
    nltk.download("wordnet")
    nltk.download("omw-1.4")


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class TriageEngine:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.teams_db = {}

        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words("english"))

        self.layer_c_enabled = os.getenv("LAYER_C_ENABLED", "true").lower() == "true"
        self.layer_c_gap_threshold = float(
            os.getenv("LAYER_C_SCORE_GAP_THRESHOLD", "0.75")
        )
        self.layer_c_model = os.getenv("LAYER_C_GROQ_MODEL", "openai/gpt-oss-120b")
        self.layer_c_timeout = float(os.getenv("LAYER_C_TIMEOUT_SECONDS", "15"))

        self.groq_client = None
        if self.layer_c_enabled and settings.GROQ_API_KEY:
            try:
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
            except Exception as exc:
                logger.warning(f"Layer C Groq init failed: {exc}")

        self.load_data()

        self.embedding_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        self.team_query_embeddings = {}
        self._precompute_embeddings()

    def load_data(self):
        logger.info(f"Loading data from {self.data_dir}")
        product_dirs = glob.glob(os.path.join(self.data_dir, "Product_*"))

        for p_dir in product_dirs:
            product_name = os.path.basename(p_dir)
            self.teams_db[product_name] = {}

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
        folder_name = os.path.basename(os.path.dirname(filepath))
        data = {
            "name": folder_name,
            "keywords": [],
            "errors": [],
            "queries": [],
        }

        try:
            with open(filepath, "r", encoding="utf-8") as file_obj:
                content = file_obj.read()

            name_match = re.search(r"name=(.+?)\n", content)
            if name_match:
                data["name"] = name_match.group(1).strip()

            primary_match = re.search(r"primary=\[(.*?)\]", content, re.DOTALL)
            if primary_match:
                raw_primary = primary_match.group(1)
                items = [
                    item.strip().strip('"').strip("'")
                    for item in raw_primary.split(",")
                    if item.strip()
                ]
                data["keywords"].extend(items)

            technical_match = re.search(r"technical=\[(.*?)\]", content, re.DOTALL)
            if technical_match:
                raw_technical = technical_match.group(1)
                items = [
                    item.strip().strip('"').strip("'")
                    for item in raw_technical.split(",")
                    if item.strip()
                ]
                data["keywords"].extend(items)

            error_match = re.search(r"error=\[(.*?)\]", content, re.DOTALL)
            if error_match:
                raw_error = error_match.group(1)
                items = [
                    item.strip().strip('"').strip("'")
                    for item in raw_error.split(",")
                    if item.strip()
                ]
                data["errors"].extend(items)

            queries_match = re.search(r"sample_queries=\[(.*?)\]", content, re.DOTALL)
            if queries_match:
                raw_queries = queries_match.group(1)
                raw_queries = raw_queries.replace("”", '"').replace("“", '"')
                matches = re.findall(r'"([^"]*)"', raw_queries)
                if not matches and raw_queries.strip():
                    matches = [q.strip() for q in raw_queries.split(",") if q.strip()]
                data["queries"].extend(matches)
        except Exception as exc:
            logger.error(f"Error parsing {filepath}: {exc}")

        return data

    def _precompute_embeddings(self):
        logger.info("Pre-computing Layer B embeddings...")
        for product, teams in self.teams_db.items():
            self.team_query_embeddings[product] = {}
            for team, team_data in teams.items():
                if team_data["queries"]:
                    embeddings = list(self.embedding_model.embed(team_data["queries"]))
                    self.team_query_embeddings[product][team] = embeddings
                else:
                    self.team_query_embeddings[product][team] = []
        logger.info("Embeddings done.")

    def preprocess(self, text: str) -> List[str]:
        text = text.lower()
        tokens = word_tokenize(text)
        clean_tokens = []
        for token in tokens:
            if token.isalnum() and token not in self.stop_words:
                lemma = self.lemmatizer.lemmatize(token)
                lemma = self.lemmatizer.lemmatize(lemma, pos="v")
                clean_tokens.append(lemma)
        return clean_tokens

    def layer_a_lexical_score(self, ticket_text: str, product: str) -> Dict[str, float]:
        if product not in self.teams_db:
            return {}

        scores = {team: 0.0 for team in self.teams_db[product]}
        ticket_lower = ticket_text.lower()

        for team, team_data in self.teams_db[product].items():
            for keyword in team_data["keywords"]:
                if keyword.lower() in ticket_lower:
                    scores[team] += 1.0

            for error_pattern in team_data["errors"]:
                if error_pattern.lower() in ticket_lower:
                    scores[team] += 3.0

        return scores

    def layer_b_semantic_score(self, ticket_text: str, product: str) -> Dict[str, float]:
        if product not in self.teams_db:
            return {}

        scores = {team: 0.0 for team in self.teams_db[product]}

        try:
            ticket_embedding = list(self.embedding_model.embed([ticket_text]))[0]
        except Exception as exc:
            logger.error(f"Embedding error: {exc}")
            return scores

        for team, team_vectors in self.team_query_embeddings.get(product, {}).items():
            if not team_vectors:
                continue

            matrix = np.array(team_vectors)
            dot_products = np.dot(matrix, ticket_embedding)
            if len(dot_products) > 0:
                scores[team] = float(np.max(dot_products))

        return scores

    def layer_c_llm_judge(
        self, ticket_text: str, candidates: List[Tuple[str, float]]
    ) -> Tuple[str, str]:
        if not candidates:
            return "Unknown", "fallback_no_candidates"

        if not self.groq_client:
            return candidates[0][0], "fallback_no_groq"

        candidate_names = [candidate[0] for candidate in candidates]
        candidate_str = ", ".join(
            [f"{name} (Score: {score:.2f})" for name, score in candidates]
        )

        prompt = (
            "You are a Ticket Triage Expert. "
            f"Choose exactly one team from this list: {candidate_str}.\n"
            "Return only the selected team key exactly as-is.\n\n"
            f"TICKET: \"{ticket_text}\"\n\n"
            "FINAL TEAM:"
        )

        try:
            response = self.groq_client.chat.completions.create(
                model=self.layer_c_model,
                messages=[
                    {
                        "role": "system",
                        "content": "Return only one team key from the provided candidate list.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0,
                max_tokens=32,
            )

            llm_output = (response.choices[0].message.content or "").strip()
            output_lower = llm_output.lower()

            for team_name in candidate_names:
                if team_name.lower() == output_lower:
                    return team_name, "groq"
                if team_name.lower() in output_lower:
                    return team_name, "groq"

            return candidates[0][0], "fallback_unrecognized_output"
        except Exception as exc:
            logger.warning(f"Layer C Groq request failed: {exc}")
            return candidates[0][0], "fallback_groq_error"

    def classify(self, ticket_text: str, product: str) -> Dict[str, Any]:
        scores_a = self.layer_a_lexical_score(ticket_text, product)
        scores_b = self.layer_b_semantic_score(ticket_text, product)

        final_scores = {}
        all_teams = set(scores_a.keys()) | set(scores_b.keys())

        for team in all_teams:
            score_a = scores_a.get(team, 0.0)
            score_b = scores_b.get(team, 0.0) * 5.0
            final_scores[team] = score_a + score_b

        sorted_teams = sorted(final_scores.items(), key=lambda item: item[1], reverse=True)

        if not sorted_teams:
            return {
                "assigned_team": "Unknown",
                "assigned_team_id": "Unknown",
                "confidence_score": 0.0,
                "details": {
                    "layer_a": scores_a,
                    "layer_b": scores_b,
                    "combined": final_scores,
                    "layer_c": {
                        "triggered": False,
                        "source": "skipped_no_candidates",
                        "decision": "Unknown",
                        "score_gap": None,
                    },
                },
                "layer_c": {
                    "triggered": False,
                    "source": "skipped_no_candidates",
                    "decision": "Unknown",
                    "score_gap": None,
                },
            }

        top_team, top_score = sorted_teams[0]
        top_two_score = sorted_teams[1][1] if len(sorted_teams) > 1 else float("-inf")
        score_gap = (
            top_score - top_two_score if len(sorted_teams) > 1 else float("inf")
        )

        candidates = sorted_teams[:3]
        should_run_layer_c = (
            self.layer_c_enabled
            and self.groq_client is not None
            and len(candidates) > 1
            and score_gap < self.layer_c_gap_threshold
        )

        final_decision = top_team
        layer_c_source = "skipped_high_confidence"

        if should_run_layer_c:
            logger.info(f"Triggering Layer C (Groq). Top candidates: {candidates}")
            final_decision, layer_c_source = self.layer_c_llm_judge(ticket_text, candidates)

        team_data = self.teams_db.get(product, {}).get(final_decision, {})
        real_team_name = team_data.get("name", final_decision) if team_data else final_decision

        layer_c_meta = {
            "triggered": should_run_layer_c,
            "source": layer_c_source,
            "decision": final_decision,
            "score_gap": score_gap,
        }

        return {
            "assigned_team": real_team_name,
            "assigned_team_id": final_decision,
            "confidence_score": top_score,
            "details": {
                "layer_a": scores_a,
                "layer_b": scores_b,
                "combined": final_scores,
                "layer_c": layer_c_meta,
            },
            "layer_c": layer_c_meta,
        }
