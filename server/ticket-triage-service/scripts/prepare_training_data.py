"""
Data Preparation Script for DistilBERT Ticket Classifier

This script prepares the training data from test.tickets.json:
1. Loads and validates the data
2. Applies data augmentation to increase dataset size
3. Handles class imbalance
4. Creates stratified splits for cross-validation
5. Encodes labels and saves artifacts
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import StratifiedKFold
from sklearn.utils.class_weight import compute_class_weight
import joblib
from typing import List, Dict, Tuple
import random

# Set random seeds for reproducibility
random.seed(42)
np.random.seed(42)

def load_tickets(json_path: str) -> pd.DataFrame:
    """Load tickets from JSON file and convert to DataFrame."""
    print(f"📂 Loading tickets from {json_path}...")
    
    with open(json_path, 'r') as f:
        tickets = json.load(f)
    
    # Extract relevant fields
    data = []
    for ticket in tickets:
        data.append({
            'ticketId': ticket.get('ticketId', ''),
            'title': ticket.get('title', ''),
            'description': ticket.get('description', ''),
            'department': ticket.get('department', 'Other'),
            'type': ticket.get('type', 'support'),
            'priority': ticket.get('priority', 'medium')
        })
    
    df = pd.DataFrame(data)
    print(f"✅ Loaded {len(df)} tickets")
    
    # Validate data
    print("\n📊 Data validation:")
    print(f"  - Tickets with title: {df['title'].notna().sum()} ({df['title'].notna().sum()/len(df)*100:.1f}%)")
    print(f"  - Tickets with description: {df['description'].notna().sum()} ({df['description'].notna().sum()/len(df)*100:.1f}%)")
    
    return df

def create_combined_text(df: pd.DataFrame) -> pd.DataFrame:
    """Create combined text from title and description."""
    print("\n🔗 Creating combined text...")
    
    # Combine title and description with [SEP] token
    df['text'] = df['title'].fillna('') + ' [SEP] ' + df['description'].fillna('')
    
    # Remove extra whitespace
    df['text'] = df['text'].str.strip()
    
    print(f"✅ Created combined text for {len(df)} tickets")
    print(f"  - Average text length: {df['text'].str.len().mean():.0f} characters")
    
    return df

def simple_augment_text(text: str, num_augmentations: int = 2) -> List[str]:
    """
    Simple text augmentation without external dependencies.
    
    Techniques:
    1. Random word shuffling (preserving meaning)
    2. Adding common filler words
    3. Slight paraphrasing
    """
    augmented = [text]  # Original text
    
    words = text.split()
    
    # Augmentation 1: Shuffle non-critical words (keep first and last)
    if len(words) > 4:
        middle = words[1:-1]
        random.shuffle(middle)
        aug1 = ' '.join([words[0]] + middle + [words[-1]])
        augmented.append(aug1)
    
    # Augmentation 2: Add emphasis words
    if num_augmentations >= 2:
        emphasis_words = ['urgent', 'please help', 'need assistance', 'issue with']
        aug2 = random.choice(emphasis_words) + ' ' + text
        augmented.append(aug2)
    
    return augmented[:num_augmentations + 1]

def augment_dataset(df: pd.DataFrame, target_samples: int = 200) -> pd.DataFrame:
    """
    Augment the dataset to reach target number of samples.
    
    Strategy:
    - Oversample minority classes more aggressively
    - Use simple augmentation techniques
    """
    print(f"\n🔄 Augmenting dataset (target: {target_samples} samples)...")
    
    # Calculate class distributions
    dept_counts = df['department'].value_counts()
    print("\n📊 Original department distribution:")
    for dept, count in dept_counts.items():
        print(f"  - {dept}: {count} ({count/len(df)*100:.1f}%)")
    
    # Identify minority classes (< 5 samples)
    minority_classes = dept_counts[dept_counts < 5].index.tolist()
    print(f"\n⚠️  Minority classes: {minority_classes}")
    
    augmented_data = []
    
    for _, row in df.iterrows():
        # Always include original
        augmented_data.append(row.to_dict())
        
        # Determine number of augmentations based on class frequency
        dept = row['department']
        if dept in minority_classes:
            num_aug = 5  # Heavily augment rare classes
        elif dept_counts[dept] < 15:
            num_aug = 3  # Moderately augment
        else:
            num_aug = 2  # Lightly augment common classes
        
        # Generate augmented versions
        augmented_texts = simple_augment_text(row['text'], num_aug)
        
        for aug_text in augmented_texts[1:]:  # Skip original
            aug_row = row.to_dict()
            aug_row['text'] = aug_text
            aug_row['ticketId'] = row['ticketId'] + f'_aug_{len(augmented_data)}'
            augmented_data.append(aug_row)
    
    augmented_df = pd.DataFrame(augmented_data)
    
    # Trim to target if exceeded
    if len(augmented_df) > target_samples:
        augmented_df = augmented_df.sample(n=target_samples, random_state=42)
    
    print(f"\n✅ Augmented dataset: {len(df)} → {len(augmented_df)} samples")
    
    # Show new distribution
    new_dept_counts = augmented_df['department'].value_counts()
    print("\n📊 Augmented department distribution:")
    for dept, count in new_dept_counts.items():
        print(f"  - {dept}: {count} ({count/len(augmented_df)*100:.1f}%)")
    
    return augmented_df

def compute_class_weights_dict(df: pd.DataFrame) -> Dict:
    """Compute class weights for handling imbalance."""
    print("\n⚖️  Computing class weights...")
    
    weights = {}
    
    for column in ['department', 'type', 'priority']:
        classes = df[column].unique()
        class_weights = compute_class_weight(
            'balanced',
            classes=classes,
            y=df[column]
        )
        weights[column] = dict(zip(classes, class_weights))
        
        print(f"\n  {column.capitalize()} weights:")
        for cls, weight in weights[column].items():
            print(f"    - {cls}: {weight:.2f}")
    
    return weights

def encode_labels(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """Encode categorical labels to integers."""
    print("\n🔢 Encoding labels...")
    
    encoders = {}
    
    for column in ['department', 'type', 'priority']:
        encoder = LabelEncoder()
        df[f'{column}_encoded'] = encoder.fit_transform(df[column])
        encoders[column] = encoder
        
        print(f"\n  {column.capitalize()} encoding:")
        for i, label in enumerate(encoder.classes_):
            print(f"    - {label}: {i}")
    
    return df, encoders

def create_stratified_splits(df: pd.DataFrame, n_splits: int = 5) -> Dict:
    """Create stratified K-fold splits."""
    print(f"\n📊 Creating {n_splits}-fold stratified splits...")
    
    # Use department for stratification (most imbalanced)
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    
    splits = []
    for fold, (train_idx, val_idx) in enumerate(skf.split(df, df['department_encoded'])):
        splits.append({
            'fold': fold,
            'train_indices': train_idx.tolist(),
            'val_indices': val_idx.tolist(),
            'train_size': len(train_idx),
            'val_size': len(val_idx)
        })
        print(f"  Fold {fold}: train={len(train_idx)}, val={len(val_idx)}")
    
    return {'splits': splits, 'n_splits': n_splits}

def main():
    """Main data preparation pipeline."""
    print("=" * 60)
    print("🚀 DistilBERT Ticket Classifier - Data Preparation")
    print("=" * 60)
    
    # Paths
    data_path = Path('/Users/hemantpc/Desktop/TMS-SIH/test.tickets.json')
    output_dir = Path('/Users/hemantpc/Desktop/TMS-SIH/server/ticket-triage-service/models')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Load data
    df = load_tickets(data_path)
    
    # 2. Create combined text
    df = create_combined_text(df)
    
    # 3. Augment dataset
    df_augmented = augment_dataset(df, target_samples=200)
    
    # 4. Encode labels
    df_augmented, label_encoders = encode_labels(df_augmented)
    
    # 5. Compute class weights
    class_weights = compute_class_weights_dict(df_augmented)
    
    # 6. Create stratified splits
    splits_info = create_stratified_splits(df_augmented)
    
    # 7. Save artifacts
    print("\n💾 Saving artifacts...")
    
    # Save processed data
    df_augmented.to_csv(output_dir / 'processed_data.csv', index=False)
    print(f"  ✅ Saved processed data to {output_dir / 'processed_data.csv'}")
    
    # Save label encoders
    joblib.dump(label_encoders, output_dir / 'label_encoders.pkl')
    print(f"  ✅ Saved label encoders to {output_dir / 'label_encoders.pkl'}")
    
    # Save class weights
    joblib.dump(class_weights, output_dir / 'class_weights.pkl')
    print(f"  ✅ Saved class weights to {output_dir / 'class_weights.pkl'}")
    
    # Save splits
    joblib.dump(splits_info, output_dir / 'splits.pkl')
    print(f"  ✅ Saved splits to {output_dir / 'splits.pkl'}")
    
    print("\n" + "=" * 60)
    print("✅ Data preparation complete!")
    print("=" * 60)
    print(f"\nSummary:")
    print(f"  - Original samples: {len(df)}")
    print(f"  - Augmented samples: {len(df_augmented)}")
    print(f"  - Number of folds: {splits_info['n_splits']}")
    print(f"  - Output directory: {output_dir}")
    print(f"\nNext step: Run train_bert_classifier.py to train the model")

if __name__ == '__main__':
    main()
