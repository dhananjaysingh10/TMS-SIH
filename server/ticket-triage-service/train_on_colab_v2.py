# 1. Install Dependencies
!pip install fastembed scikit-learn pandas numpy nltk imbalanced-learn

# 2. Imports
import os
import pandas as pd
import pickle
import numpy as np
import logging
import nltk
from fastembed import TextEmbedding
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from imblearn.over_sampling import SMOTE
from google.colab import files
import io
import torch

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
LOG = logging.getLogger("ColabTrainer_Pro")

# --- GPU CHECK ---
if torch.cuda.is_available():
    LOG.info(f"🟢 GPU DETECTED: {torch.cuda.get_device_name(0)}")
else:
    LOG.warning("🔴 NO GPU DETECTED! (Go to Runtime -> Change runtime type -> T4 GPU)")
# -----------------

# 3. Simple Ontology
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
            synsets = self.wordnet.synsets(word)
            if synsets:
                for lemma in synsets[0].lemmas():
                    expanded_terms.add(lemma.name().replace('_', ' '))
                if len(expanded_terms) > 30: break # Optim: limit limit
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

# 7. Split Train/Test (80/20)
X_train, X_test, y_train, y_test = train_test_split(X_all, y, test_size=0.2, random_state=42, stratify=y)
LOG.info(f"📊 Split: {len(X_train)} Train, {len(X_test)} Test")

# 7.5 SMOTE (Balance the Classes)
# Some classes have very few samples (e.g. Web Dev), SMOTE creates synthetic ones.
LOG.info("⚖️ Balancing Classes with SMOTE...")
smote = SMOTE(k_neighbors=1, random_state=42) # k=1 because some classes have only 2 samples
X_train_res, y_train_res = smote.fit_resample(X_train, y_train)

# 8. Train (Random Forest - More Powerful)
LOG.info("🏋️ Training Random Forest (GridSearch for Best Params)...")
param_grid = { 
    'n_estimators': [100, 200],
    'max_depth': [10, 20, None],
    'class_weight': ['balanced', 'balanced_subsample']
}
rf = RandomForestClassifier(random_state=42)
grid_search = GridSearchCV(estimator=rf, param_grid=param_grid, cv=3, n_jobs=-1, verbose=2)
grid_search.fit(X_train_res, y_train_res)

best_clf = grid_search.best_estimator_
LOG.info(f"✅ Best Params: {grid_search.best_params_}")

# Compute Centroids (for the hybrid engine compatibility)
centroids = {}
for label_idx, dept_name in enumerate(label_encoder.classes_):
    class_mask = y_train == label_idx # Use original train, not synthetic
    class_embeddings = X_train[class_mask]
    if len(class_embeddings) > 0:
        centroid = np.mean(class_embeddings, axis=0)
        centroid = centroid / np.linalg.norm(centroid)
        centroids[dept_name] = centroid

# 9. Evaluate on TEST Data
y_pred_test = best_clf.predict(X_test)
acc = accuracy_score(y_test, y_pred_test)
print("\n" + "="*40)
print(f"🚀 UNSEEN TEST ACCURACY: {acc:.2%}")
print("="*40)
print(classification_report(y_test, y_pred_test, target_names=label_encoder.classes_))

# 10. Save & Download
LOG.info("💾 Packaging models for download...")
# Note: We save it as 'lr_model.pkl' even though it's RF, 
# so you don't have to change your engine.py code.
with open("lr_model.pkl", "wb") as f: pickle.dump(best_clf, f)
with open("centroids.pkl", "wb") as f: pickle.dump(centroids, f)
with open("label_encoder.pkl", "wb") as f: pickle.dump(label_encoder, f)

files.download("lr_model.pkl")
files.download("centroids.pkl")
files.download("label_encoder.pkl")
print("✅ Download initiated!")
