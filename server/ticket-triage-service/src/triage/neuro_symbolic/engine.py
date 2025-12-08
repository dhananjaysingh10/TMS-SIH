import os
import pickle
import numpy as np
import logging
from typing import Dict, Any, List
from fastembed import TextEmbedding
from .ontology import semantic_expander

LOG = logging.getLogger("triage_engine")

class TriageEngine:
    def __init__(self, model_path: str = "storage/models"):
        self.model_path = model_path
        self.embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        
       
        self.lr_model = self._load_pickle(f"{model_path}/lr_model.pkl")
        self.centroids = self._load_pickle(f"{model_path}/centroids.pkl")
        self.label_encoder = self._load_pickle(f"{model_path}/label_encoder.pkl")
        
        if not all([self.lr_model, self.centroids, self.label_encoder]):
            LOG.warning("⚠️ Neuro-Symbolic models not found. Engine will run in specific mode or fail.")

    def _load_pickle(self, path: str):
        try:
            if os.path.exists(path):
                with open(path, "rb") as f:
                    return pickle.load(f)
        except Exception as e:
            LOG.error(f"❌ Failed to load {path}: {e}")
        return None

    def _cosine_similarity(self, vec1, vec2):
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

    def predict(self, ticket: Dict[str, Any]) -> Dict[str, Any]:
       
        original_text = f"{ticket.get('title', '')} {ticket.get('description', '')}"
        
        # 1. Semantic Expansion (Symbolic Layer)
        expanded_text = semantic_expander.expand_text(original_text)
        LOG.info(f"🧠 Original: {original_text[:50]}... -> Expanded: {expanded_text[:50]}...")
        
        # 2. Embedding (Neural Layer)
        # FastEmbed returns a generator
        embedding = list(self.embedding_model.embed([expanded_text]))[0]
        
        # 3. Similarity Matching (Retrieval Layer)
        sim_scores = {}
        if self.centroids:
            for dept, centroid in self.centroids.items():
                sim_scores[dept] = self._cosine_similarity(embedding, centroid)
            
            # Get top similarity match
            best_sim_dept = max(sim_scores, key=sim_scores.get)
            best_sim_score = sim_scores[best_sim_dept]
            LOG.info(f"📐 Similarity Winner: {best_sim_dept} ({best_sim_score:.4f})")
        else:
            best_sim_dept = None
            best_sim_score = 0
            
        # 4. Statistical Classification (Decision Layer)
        lr_dept = None
        lr_prob = 0
        if self.lr_model and self.label_encoder:
            # Predict
            probs = self.lr_model.predict_proba([embedding])[0]
            max_idx = np.argmax(probs)
            lr_prob = probs[max_idx]
            lr_dept = self.label_encoder.inverse_transform([max_idx])[0]
            LOG.info(f"📊 Classifier Winner: {lr_dept} ({lr_prob:.4f})")
            
        # 5. Fusion Engine the hybrid logic of ours
        final_dept = "Other"
        concidence = 0.0
        method = "fallback"
        
        
        # Strong Classifier Confidence
        if lr_dept and lr_prob > 0.85:
            final_dept = lr_dept
            confidence = lr_prob
            method = "classifier_strong"
        
        # High Similarity Agreement
        elif best_sim_dept and lr_dept and best_sim_dept == lr_dept:
             final_dept = best_sim_dept
             # Boost confidence if both agree
             confidence = (best_sim_score + lr_prob) / 2 + 0.1 
             method = "agreement_boost"
             
        # Similarity Fallback (if classifier is unsure but similarity is high)
        elif best_sim_dept and best_sim_score > 0.8:
            final_dept = best_sim_dept
            confidence = best_sim_score
            method = "similarity_high"
            
        # Classifier Fallback (if reasonable)
        elif lr_dept and lr_prob > 0.6:
            final_dept = lr_dept
            confidence = lr_prob
            method = "classifier_weak"
            
        else:
            final_dept = "Other"
            confidence = 0.3
            method = "uncertain"

        # Cap confidence
        confidence = min(confidence, 1.0)
        
        return {
            "department": final_dept,
            "confidence": float(confidence),
            "method": method,
            "original_text": original_text,
            "expanded_text": expanded_text
        }

# Global Instance
engine = TriageEngine()
