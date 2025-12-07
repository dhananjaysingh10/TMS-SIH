"""
Training Script for DistilBERT Ticket Classifier

This script trains the DistilBERT classifier using the prepared data with:
- 5-fold cross-validation
- Class-weighted loss for imbalance
- Early stopping
- Comprehensive evaluation metrics
"""

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
from pathlib import Path
import joblib
from sklearn.metrics import classification_report, confusion_matrix, f1_score
import json
from tqdm import tqdm

import sys
sys.path.append(str(Path(__file__).parent.parent))

from src.triage.llm.bert_classifier import DistilBERTClassifier

class TicketDataset(Dataset):
    """PyTorch Dataset for ticket classification."""
    
    def __init__(self, texts, dept_labels, type_labels, priority_labels, tokenizer, max_length=512):
        self.texts = texts
        self.dept_labels = dept_labels
        self.type_labels = type_labels
        self.priority_labels = priority_labels
        self.tokenizer = tokenizer
        self.max_length = max_length
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        
        # Tokenize
        encoding = self.tokenizer(
            text,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].squeeze(0),
            'attention_mask': encoding['attention_mask'].squeeze(0),
            'dept_label': torch.tensor(self.dept_labels[idx], dtype=torch.long),
            'type_label': torch.tensor(self.type_labels[idx], dtype=torch.long),
            'priority_label': torch.tensor(self.priority_labels[idx], dtype=torch.long)
        }

class MultiTaskLoss(nn.Module):
    """Multi-task loss with class weights."""
    
    def __init__(self, dept_weights, type_weights, priority_weights, device):
        super().__init__()
        self.dept_criterion = nn.CrossEntropyLoss(weight=torch.tensor(dept_weights, dtype=torch.float32).to(device))
        self.type_criterion = nn.CrossEntropyLoss(weight=torch.tensor(type_weights, dtype=torch.float32).to(device))
        self.priority_criterion = nn.CrossEntropyLoss(weight=torch.tensor(priority_weights, dtype=torch.float32).to(device))
        
        # Task weights (equal by default)
        self.dept_weight = 1.0
        self.type_weight = 1.0
        self.priority_weight = 1.0
    
    def forward(self, dept_logits, type_logits, priority_logits,
                dept_labels, type_labels, priority_labels):
        dept_loss = self.dept_criterion(dept_logits, dept_labels)
        type_loss = self.type_criterion(type_logits, type_labels)
        priority_loss = self.priority_criterion(priority_logits, priority_labels)
        
        total_loss = (self.dept_weight * dept_loss + 
                     self.type_weight * type_loss + 
                     self.priority_weight * priority_loss)
        
        return total_loss, dept_loss, type_loss, priority_loss

def train_epoch(model, dataloader, criterion, optimizer, device, scheduler=None):
    """Train for one epoch."""
    model.train()
    total_loss = 0
    dept_losses, type_losses, priority_losses = [], [], []
    
    progress_bar = tqdm(dataloader, desc='Training')
    for batch in progress_bar:
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        dept_labels = batch['dept_label'].to(device)
        type_labels = batch['type_label'].to(device)
        priority_labels = batch['priority_label'].to(device)
        
        # Forward pass
        dept_logits, type_logits, priority_logits = model(input_ids, attention_mask)
        
        # Compute loss
        loss, dept_loss, type_loss, priority_loss = criterion(
            dept_logits, type_logits, priority_logits,
            dept_labels, type_labels, priority_labels
        )
        
        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        
        # Gradient clipping
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        
        optimizer.step()
        if scheduler:
            scheduler.step()
        
        total_loss += loss.item()
        dept_losses.append(dept_loss.item())
        type_losses.append(type_loss.item())
        priority_losses.append(priority_loss.item())
        
        progress_bar.set_postfix({'loss': f'{loss.item():.4f}'})
    
    return {
        'total_loss': total_loss / len(dataloader),
        'dept_loss': np.mean(dept_losses),
        'type_loss': np.mean(type_losses),
        'priority_loss': np.mean(priority_losses)
    }

def evaluate(model, dataloader, criterion, device, label_encoders):
    """Evaluate the model."""
    model.eval()
    total_loss = 0
    
    all_dept_preds, all_dept_true = [], []
    all_type_preds, all_type_true = [], []
    all_priority_preds, all_priority_true = [], []
    
    with torch.no_grad():
        for batch in tqdm(dataloader, desc='Evaluating'):
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            dept_labels = batch['dept_label'].to(device)
            type_labels = batch['type_label'].to(device)
            priority_labels = batch['priority_label'].to(device)
            
            # Forward pass
            dept_logits, type_logits, priority_logits = model(input_ids, attention_mask)
            
            # Compute loss
            loss, _, _, _ = criterion(
                dept_logits, type_logits, priority_logits,
                dept_labels, type_labels, priority_labels
            )
            
            total_loss += loss.item()
            
            # Get predictions
            dept_preds = torch.argmax(dept_logits, dim=1)
            type_preds = torch.argmax(type_logits, dim=1)
            priority_preds = torch.argmax(priority_logits, dim=1)
            
            all_dept_preds.extend(dept_preds.cpu().numpy())
            all_dept_true.extend(dept_labels.cpu().numpy())
            all_type_preds.extend(type_preds.cpu().numpy())
            all_type_true.extend(type_labels.cpu().numpy())
            all_priority_preds.extend(priority_preds.cpu().numpy())
            all_priority_true.extend(priority_labels.cpu().numpy())
    
    # Calculate metrics
    dept_f1 = f1_score(all_dept_true, all_dept_preds, average='macro')
    type_f1 = f1_score(all_type_true, all_type_preds, average='macro')
    priority_f1 = f1_score(all_priority_true, all_priority_preds, average='macro')
    
    return {
        'loss': total_loss / len(dataloader),
        'dept_f1': dept_f1,
        'type_f1': type_f1,
        'priority_f1': priority_f1,
        'avg_f1': (dept_f1 + type_f1 + priority_f1) / 3,
        'predictions': {
            'dept': (all_dept_true, all_dept_preds),
            'type': (all_type_true, all_type_preds),
            'priority': (all_priority_true, all_priority_preds)
        }
    }

def train_fold(fold_idx, train_data, val_data, config, device):
    """Train a single fold."""
    print(f"\n{'='*60}")
    print(f"Training Fold {fold_idx + 1}/{config['n_folds']}")
    print(f"{'='*60}")
    
    # Create datasets
    from transformers import DistilBertTokenizer
    tokenizer = DistilBertTokenizer.from_pretrained(config['model_name'])
    
    train_dataset = TicketDataset(
        train_data['text'].values,
        train_data['department_encoded'].values,
        train_data['type_encoded'].values,
        train_data['priority_encoded'].values,
        tokenizer
    )
    
    val_dataset = TicketDataset(
        val_data['text'].values,
        val_data['department_encoded'].values,
        val_data['type_encoded'].values,
        val_data['priority_encoded'].values,
        tokenizer
    )
    
    train_loader = DataLoader(train_dataset, batch_size=config['batch_size'], shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=config['batch_size'])
    
    # Initialize model
    model = DistilBERTClassifier(
        model_name=config['model_name'],
        num_departments=len(config['label_encoders']['department'].classes_),
        num_types=len(config['label_encoders']['type'].classes_),
        num_priorities=len(config['label_encoders']['priority'].classes_),
        dropout=config['dropout']
    ).to(device)
    
    # Prepare class weights
    dept_weights = [config['class_weights']['department'][cls] 
                    for cls in config['label_encoders']['department'].classes_]
    type_weights = [config['class_weights']['type'][cls] 
                    for cls in config['label_encoders']['type'].classes_]
    priority_weights = [config['class_weights']['priority'][cls] 
                        for cls in config['label_encoders']['priority'].classes_]
    
    criterion = MultiTaskLoss(dept_weights, type_weights, priority_weights, device)
    
    # Optimizer and scheduler
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config['learning_rate'],
        weight_decay=config['weight_decay']
    )
    
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=10, T_mult=2
    )
    
    # Training loop
    best_val_f1 = 0
    patience_counter = 0
    
    for epoch in range(config['epochs']):
        print(f"\nEpoch {epoch + 1}/{config['epochs']}")
        
        # Train
        train_metrics = train_epoch(model, train_loader, criterion, optimizer, device, scheduler)
        print(f"Train Loss: {train_metrics['total_loss']:.4f}")
        
        # Validate
        val_metrics = evaluate(model, val_loader, criterion, device, config['label_encoders'])
        print(f"Val Loss: {val_metrics['loss']:.4f}, Val F1: {val_metrics['avg_f1']:.4f}")
        print(f"  - Dept F1: {val_metrics['dept_f1']:.4f}")
        print(f"  - Type F1: {val_metrics['type_f1']:.4f}")
        print(f"  - Priority F1: {val_metrics['priority_f1']:.4f}")
        
        # Early stopping
        if val_metrics['avg_f1'] > best_val_f1:
            best_val_f1 = val_metrics['avg_f1']
            patience_counter = 0
            # Save best model
            torch.save(model.state_dict(), config['output_dir'] / f'best_model_fold_{fold_idx}.pt')
        else:
            patience_counter += 1
            if patience_counter >= config['patience']:
                print(f"\nEarly stopping at epoch {epoch + 1}")
                break
    
    # Load best model for final evaluation
    model.load_state_dict(torch.load(config['output_dir'] / f'best_model_fold_{fold_idx}.pt'))
    final_metrics = evaluate(model, val_loader, criterion, device, config['label_encoders'])
    
    return model, final_metrics, tokenizer

def main():
    """Main training pipeline."""
    print("=" * 60)
    print("🚀 DistilBERT Ticket Classifier - Training")
    print("=" * 60)
    
    # Configuration
    config = {
        'model_name': 'distilbert-base-uncased',
        'batch_size': 8,
        'learning_rate': 2e-4,
        'weight_decay': 0.01,
        'epochs': 50,
        'patience': 10,
        'dropout': 0.3,
        'n_folds': 5,
        'output_dir': Path('/Users/hemantpc/Desktop/TMS-SIH/server/ticket-triage-service/models/bert_classifier')
    }
    
    config['output_dir'].mkdir(parents=True, exist_ok=True)
    
    # Load prepared data
    data_dir = Path('/Users/hemantpc/Desktop/TMS-SIH/server/ticket-triage-service/models')
    df = pd.read_csv(data_dir / 'processed_data.csv')
    config['label_encoders'] = joblib.load(data_dir / 'label_encoders.pkl')
    config['class_weights'] = joblib.load(data_dir / 'class_weights.pkl')
    splits_info = joblib.load(data_dir / 'splits.pkl')
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"\n🖥️  Using device: {device}")
    
    # Train each fold
    fold_results = []
    
    for fold_idx, split in enumerate(splits_info['splits']):
        train_data = df.iloc[split['train_indices']]
        val_data = df.iloc[split['val_indices']]
        
        model, metrics, tokenizer = train_fold(fold_idx, train_data, val_data, config, device)
        fold_results.append(metrics)
    
    # Average results across folds
    avg_metrics = {
        'dept_f1': np.mean([r['dept_f1'] for r in fold_results]),
        'type_f1': np.mean([r['type_f1'] for r in fold_results]),
        'priority_f1': np.mean([r['priority_f1'] for r in fold_results]),
        'avg_f1': np.mean([r['avg_f1'] for r in fold_results])
    }
    
    print("\n" + "=" * 60)
    print("✅ Training Complete!")
    print("=" * 60)
    print(f"\nAverage Cross-Validation Results:")
    print(f"  - Department F1: {avg_metrics['dept_f1']:.4f}")
    print(f"  - Type F1: {avg_metrics['type_f1']:.4f}")
    print(f"  - Priority F1: {avg_metrics['priority_f1']:.4f}")
    print(f"  - Overall F1: {avg_metrics['avg_f1']:.4f}")
    
    # Save best fold model as final model
    best_fold = np.argmax([r['avg_f1'] for r in fold_results])
    print(f"\n📦 Saving best model (Fold {best_fold + 1})...")
    
    # Copy best model
    import shutil
    shutil.copy(
        config['output_dir'] / f'best_model_fold_{best_fold}.pt',
        config['output_dir'] / 'model.pt'
    )
    
    # Save tokenizer
    tokenizer.save_pretrained(str(config['output_dir'] / 'tokenizer'))
    
    # Save label encoders and class weights
    joblib.dump(config['label_encoders'], config['output_dir'] / 'label_encoders.pkl')
    joblib.dump(config['class_weights'], config['output_dir'] / 'class_weights.pkl')
    
    # Save metrics
    with open(config['output_dir'] / 'evaluation_report.json', 'w') as f:
        json.dump({
            'avg_metrics': avg_metrics,
            'fold_results': [{k: v for k, v in r.items() if k != 'predictions'} for r in fold_results],
            'config': {k: str(v) if isinstance(v, Path) else v for k, v in config.items() 
                      if k not in ['label_encoders', 'class_weights']}
        }, f, indent=2)
    
    print(f"✅ Model saved to {config['output_dir']}")
    print(f"\nNext step: Update classifier.py to use the hybrid approach")

if __name__ == '__main__':
    main()
