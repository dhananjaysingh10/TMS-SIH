# 1. Install Dependencies
!pip install fastembed scikit-learn pandas numpy nltk

# 2. Imports
import os
import pandas as pd
import pickle
import numpy as np
import logging
import nltk
from fastembed import TextEmbedding
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from google.colab import files
import io

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
LOG = logging.getLogger("ColabTrainer")

# --- GPU CHECK ---
import torch
if torch.cuda.is_available():
    LOG.info(f"🟢 GPU DETECTED: {torch.cuda.get_device_name(0)}")
    LOG.info("   Training will be fast! 🚀")
else:
    LOG.warning("🔴 NO GPU DETECTED!")
    LOG.warning("   Training will be SLOW (CPU Mode).")
    LOG.warning("   To fix: Go to Runtime -> Change runtime type -> T4 GPU")
# -----------------

# 3. Simple Ontology (Inline for Colab)
class SimpleSemanticExpander:
    def __init__(self):
        nltk.download('wordnet', quiet=True)
        nltk.download('omw-1.4', quiet=True)
        from nltk.corpus import wordnet
        self.wordnet = wordnet
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
            # Simple WordNet (Top 1 synonym)
            synsets = self.wordnet.synsets(word)
            if synsets:
                for lemma in synsets[0].lemmas():
                    expanded_terms.add(lemma.name().replace('_', ' '))
        return " ".join(expanded_terms)

expander = SimpleSemanticExpander()

# 4. Upload Data
print("📂 Please upload your CSV file (tickets_split_05_with_departments (1).csv)...")
uploaded = files.upload()
filename = next(iter(uploaded)) # Get the first uploaded file

# 5. Load and Preprocess
LOG.info(f"✅ Loaded {filename}")
df = pd.read_csv(io.BytesIO(uploaded[filename]))

# Handle column names (Case insensitive check)
cols = {c.lower(): c for c in df.columns}
if 'ticket_content' in cols:
    text_col = cols['ticket_content']
elif 'query_text' in cols:
    text_col = cols['query_text']
else:
    raise ValueError("Could not find 'ticket_content' or 'Query_Text' column")

if 'department' in cols:
    label_col = cols['department']
else:
    raise ValueError("Could not find 'Department' column")

df['text'] = df[text_col].astype(str)
labels = df[label_col].values

# Encode Labels
label_encoder = LabelEncoder()
y = label_encoder.fit_transform(labels)

# 6. Expand & Embed
LOG.info("🧠 Semantic Expansion & SBERT Vectorization (This needs GPU/CPU)...")
df['expanded_text'] = df['text'].apply(expander.expand_text)
embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
embeddings = list(embedding_model.embed(df['expanded_text'].tolist()))
X_all = np.array([list(e) for e in embeddings])

# 7. Split Train/Test (80/20)
X_train, X_test, y_train, y_test = train_test_split(X_all, y, test_size=0.2, random_state=42, stratify=y)
LOG.info(f"📊 Split: {len(X_train)} Train, {len(X_test)} Test")

# 8. Train & Centroids
LOG.info("🏋️ Training Models...")
clf = LogisticRegression(max_iter=1000, class_weight='balanced', C=1.0)
clf.fit(X_train, y_train)

centroids = {}
for label_idx, dept_name in enumerate(label_encoder.classes_):
    class_mask = y_train == label_idx
    class_embeddings = X_train[class_mask]
    if len(class_embeddings) > 0:
        centroid = np.mean(class_embeddings, axis=0)
        centroid = centroid / np.linalg.norm(centroid)
        centroids[dept_name] = centroid

# 9. Evaluate on TEST Data
y_pred_test = clf.predict(X_test)
acc = accuracy_score(y_test, y_pred_test)
print("\n" + "="*40)
print(f"🚀 UNSEEN TEST ACCURACY: {acc:.2%}")
print("="*40)
print(classification_report(y_test, y_pred_test, target_names=label_encoder.classes_))

# 10. Save & Download
LOG.info("💾 Packaging models for download...")
with open("lr_model.pkl", "wb") as f: pickle.dump(clf, f)
with open("centroids.pkl", "wb") as f: pickle.dump(centroids, f)
with open("label_encoder.pkl", "wb") as f: pickle.dump(label_encoder, f)

files.download("lr_model.pkl")
files.download("centroids.pkl")
files.download("label_encoder.pkl")
print("✅ Download initiated! Place these files in 'server/ticket-triage-service/storage/models/'")
