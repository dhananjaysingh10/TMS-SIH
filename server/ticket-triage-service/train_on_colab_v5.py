# 1. Install Dependencies
!pip install fastembed scikit-learn pandas numpy nltk imbalanced-learn xgboost

# 2. Imports
import os
import pandas as pd
import pickle
import numpy as np
import logging
import nltk
from fastembed import TextEmbedding
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from imblearn.over_sampling import SVMSMOTE
from google.colab import files
import io
import torch

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
LOG = logging.getLogger("ColabTrainer_Hybrid")

# --- GPU CHECK ---
if torch.cuda.is_available():
    LOG.info(f"🟢 GPU DETECTED: {torch.cuda.get_device_name(0)}")
else:
    LOG.warning("🔴 NO GPU DETECTED!")
# -----------------

# 3. Simple Ontology
class SimpleSemanticExpander:
    def __init__(self):
        nltk.download('wordnet', quiet=True)
        nltk.download('omw-1.4', quiet=True)
        from nltk.corpus import wordnet
        self.wordnet = wordnet
        # Copying actual Ontology from project
        self.domain_ontology = {
            "vpn": ["network", "connection", "tunnel", "gateway", "access"],
            "wifi": ["network", "internet", "wireless", "signal", "connection"],
            "printer": ["hardware", "peripheral", "device", "paper", "toner"],
            "monitor": ["hardware", "screen", "display", "peripheral"],
            "software": ["application", "program", "license", "install"],
            "email": ["communication", "outlook", "mailbox", "exchange"],
            "login": ["access", "auth", "password", "credential", "security"],
            "slow": ["performance", "latency", "network", "bandwidth"],
            "crash": ["bug", "error", "failure", "restart"],
            "virus": ["security", "malware", "threat", "scan"]
        }

    def expand_text(self, text):
        if not isinstance(text, str): return ""
        words = text.lower().split()
        expanded_terms = set(words)
        for word in words:
            if word in self.domain_ontology:
                expanded_terms.update(self.domain_ontology[word])
            synsets = self.wordnet.synsets(word)
            if synsets:
                for lemma in synsets[0].lemmas():
                    expanded_terms.add(lemma.name().replace('_', ' '))
                if len(expanded_terms) > 30: break 
        return " ".join(expanded_terms)

expander = SimpleSemanticExpander()

# 4. Upload Data
print("📂 Please upload your MERGED file (merged_training_data.csv)...")
uploaded = files.upload()
filename = next(iter(uploaded)) 
df = pd.read_csv(io.BytesIO(uploaded[filename]))

# Handle column names
cols = {c.lower(): c for c in df.columns}
text_col = cols.get('text') or cols.get('ticket_content') or cols.get('query_text')
label_col = cols.get('department')
df['text'] = df[text_col].astype(str)
labels = df[label_col].values

# Encode Labels
label_encoder = LabelEncoder()
y = label_encoder.fit_transform(labels)

# 6. Expand & Embed
LOG.info("🧠 Semantic Expansion & SBERT Vectorization...")
df['expanded_text'] = df['text'].apply(expander.expand_text)
embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
embeddings = list(embedding_model.embed(df['expanded_text'].tolist()))
X_all = np.array([list(e) for e in embeddings])

# 7. Split Train/Test (85/15)
X_train, X_test, y_train, y_test = train_test_split(X_all, y, test_size=0.15, random_state=42, stratify=y)
LOG.info(f"📊 Split: {len(X_train)} Train, {len(X_test)} Test")

# 7.5 SMOTE
LOG.info("⚖️ Advanced Balancing (SVM-SMOTE)...")
smote = SVMSMOTE(k_neighbors=1, random_state=42)
X_train_res, y_train_res = smote.fit_resample(X_train, y_train)

# 8. Train (SVM - Best Performer)
LOG.info("🏋️ Training SVM (RBF Kernel)...")
clf = SVC(kernel='rbf', C=10, class_weight='balanced', probability=True, random_state=42)
clf.fit(X_train_res, y_train_res)

# Compute Centroids
LOG.info("📍 Computing Centroids...")
centroids = {}
for label_idx, dept_name in enumerate(label_encoder.classes_):
    class_mask = y_train == label_idx 
    class_embeddings = X_train[class_mask]
    if len(class_embeddings) > 0:
        centroid = np.mean(class_embeddings, axis=0)
        centroid = centroid / np.linalg.norm(centroid)
        centroids[dept_name] = centroid

# ==========================================
# 9. HYBRID ENGINE SIMULATION (Real Accuracy)
# ==========================================
def hybrid_predict(vector):
    # A. Classifier Vote
    probs = clf.predict_proba([vector])[0]
    max_idx = np.argmax(probs)
    lr_prob = probs[max_idx]
    lr_dept = label_encoder.classes_[max_idx]

    # B. Similarity Vote
    sim_scores = {}
    for dept, centroid in centroids.items():
        sim_scores[dept] = np.dot(vector, centroid) / (np.linalg.norm(vector) * np.linalg.norm(centroid))
    best_sim_dept = max(sim_scores, key=sim_scores.get)
    best_sim_score = sim_scores[best_sim_dept]

    # C. Fusion Logic (The "Secret Sauce")
    final_dept = "Other"
    
    if lr_prob > 0.85: # High confidence classifier
        final_dept = lr_dept
    elif best_sim_dept == lr_dept: # Agreement
        final_dept = best_sim_dept
    elif best_sim_score > 0.8: # High confidence similarity
        final_dept = best_sim_dept
    elif lr_prob > 0.5: # Weak classifier
        final_dept = lr_dept
    else:
        final_dept = "Other" # Or best guess

    return label_encoder.transform([final_dept])[0] if final_dept in label_encoder.classes_ else -1

LOG.info("🧪 Testing Hybrid Engine on Unseen Data...")
y_pred_hybrid = []
for vec in X_test:
    y_pred_hybrid.append(hybrid_predict(vec))

acc = accuracy_score(y_test, y_pred_hybrid)
print("\n" + "="*40)
print(f"🚀 REAL HYBRID SYSTEM ACCURACY: {acc:.2%}")
print("="*40)
print(classification_report(y_test, y_pred_hybrid, target_names=label_encoder.classes_))

# 10. Save & Download
LOG.info("💾 Packaging...")
with open("lr_model.pkl", "wb") as f: pickle.dump(clf, f)
with open("centroids.pkl", "wb") as f: pickle.dump(centroids, f)
with open("label_encoder.pkl", "wb") as f: pickle.dump(label_encoder, f)

files.download("lr_model.pkl")
files.download("centroids.pkl")
files.download("label_encoder.pkl")
print("✅ Download initiated!")
