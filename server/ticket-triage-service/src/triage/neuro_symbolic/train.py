import os
import pandas as pd
import pickle
import numpy as np
import logging
from fastembed import TextEmbedding
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
from src.triage.neuro_symbolic.ontology import semantic_expander

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
LOG = logging.getLogger("train_neuro_symbolic")

# Paths
DATA_PATH = "Data/tickets_split_05_with_departments (1).csv"
MODEL_DIR = "storage/models"

def train():
    if not os.path.exists(DATA_PATH):
        LOG.error(f"❌ Data file not found at {DATA_PATH}")
        return

    os.makedirs(MODEL_DIR, exist_ok=True)
    
    LOG.info("1️⃣ Loading Data...")
    df = pd.read_csv(DATA_PATH)
    LOG.info(f"   Loaded {len(df)} tickets.")
    
    # Preprocessing
    # New CSV has 'ticket_content'
    df['text'] = df['ticket_content'].astype(str)
    labels = df['Department'].values
    
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(labels)
    
    LOG.info(f"   Classes: {label_encoder.classes_}")
    
    # 2️⃣ Semantic Expansion
    LOG.info("2️⃣ expanding text with Neuro-Symbolic Ontology...")
    df['expanded_text'] = df['text'].apply(semantic_expander.expand_text)
    
    # 3️⃣ SBERT Embedding (The "Neural" Part)
    # Note: FastEmbed IS the library that runs SBERT models (like BAAI/bge-small-en). 
    # It's faster and lighter than the 'sentence-transformers' library but does the exact same thing.
    LOG.info("3️⃣ Generating SBERT Embeddings (Neural Layer)...")
    embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    
    # Embed ALL text first (converting text -> numbers)
    embeddings = list(embedding_model.embed(df['expanded_text'].tolist()))
    X_all = np.array([list(e) for e in embeddings])
    
    # 4️⃣ Split Data (80% Train, 20% Test) - Answering "Unseen Data" Request
    from sklearn.model_selection import train_test_split
    LOG.info("4️⃣ Splitting Data: 80% Training, 20% Testing (Unseen)...")
    X_train, X_test, y_train, y_test = train_test_split(X_all, y, test_size=0.2, random_state=42, stratify=y)
    
    LOG.info(f"   Training Size: {len(X_train)}")
    LOG.info(f"   Testing Size:  {len(X_test)}")

    # 5️⃣ Compute Centroids (Similarity Layer) - USING ONLY TRAIN DATA
    LOG.info("5️⃣ Computing Department Centroids (from Training Data)...")
    centroids = {}
    for label_idx, dept_name in enumerate(label_encoder.classes_):
        # Filter embeddings for this class (only from training set)
        class_mask = y_train == label_idx
        class_embeddings = X_train[class_mask]
        
        if len(class_embeddings) > 0:
            centroid = np.mean(class_embeddings, axis=0)
            centroid = centroid / np.linalg.norm(centroid) # Normalize
            centroids[dept_name] = centroid
            
    # 6️⃣ Train Classifier (Statistical Layer) - USING ONLY TRAIN DATA
    LOG.info("6️⃣ Training Logistic Regression (Decision Layer)...")
    clf = LogisticRegression(max_iter=1000, class_weight='balanced', C=1.0)
    clf.fit(X_train, y_train)
    
    # 7️⃣ EVALUATE ON UNSEEN TEST DATA
    LOG.info("="*40)
    LOG.info("🧪 PREDICTING ON UNSEEN TEST DATA (20%)")
    LOG.info("="*40)
    
    y_pred_test = clf.predict(X_test)
    
    test_acc = accuracy_score(y_test, y_pred_test)
    LOG.info(f"🚀 TEST ACCURACY: {test_acc:.2%}")
    
    report = classification_report(y_test, y_pred_test, target_names=label_encoder.classes_)
    LOG.info("\n📊 Test Classification Report:\n" + report)
    
    # Confusion Matrix (Test)
    from sklearn.metrics import confusion_matrix
    cm = confusion_matrix(y_test, y_pred_test)
    LOG.info(f"\n🧩 Confusion Matrix (Test Data):\n{cm}")
    
    # Save Artifacts
    LOG.info("💾 Saving Models...")
    with open(f"{MODEL_DIR}/lr_model.pkl", "wb") as f:
        pickle.dump(clf, f)
        
    with open(f"{MODEL_DIR}/centroids.pkl", "wb") as f:
        pickle.dump(centroids, f)
        
    with open(f"{MODEL_DIR}/label_encoder.pkl", "wb") as f:
        pickle.dump(label_encoder, f)
        
    LOG.info("🎉 Neuro-Symbolic Engine Training Complete!")

if __name__ == "__main__":
    train()
