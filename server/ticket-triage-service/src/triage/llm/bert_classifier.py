"""
DistilBERT-based Ticket Classifier

This module implements a hybrid classification system using DistilBERT for ticket classification.
The model uses a frozen DistilBERT encoder with trainable classification heads to prevent overfitting
on the small dataset (65 samples).
"""

import torch
import torch.nn as nn
from transformers import DistilBertModel, DistilBertTokenizer
import numpy as np
from typing import Dict, List, Tuple
import joblib
from pathlib import Path

class DistilBERTClassifier(nn.Module):
    """
    Multi-task DistilBERT classifier for ticket classification.
    
    Architecture:
        Input Text → DistilBERT (frozen) → [CLS] Token (768-dim)
                                           ↓
                                     Shared Layer (256-dim)
                                     ├→ Dept Head (6 classes)
                                     ├→ Type Head (4 classes)
                                     └→ Priority Head (4 classes)
    """
    
    def __init__(self, 
                 model_name='distilbert-base-uncased',
                 num_departments=6,
                 num_types=4,
                 num_priorities=4,
                 dropout=0.3,
                 freeze_bert=True):
        super().__init__()
        
        # Load pre-trained DistilBERT
        self.bert = DistilBertModel.from_pretrained(model_name)
        self.tokenizer = DistilBertTokenizer.from_pretrained(model_name)
        
        # Freeze BERT parameters to prevent overfitting
        if freeze_bert:
            for param in self.bert.parameters():
                param.requires_grad = False
        
        # Shared feature layer
        self.shared_layer = nn.Sequential(
            nn.Linear(768, 256),  # DistilBERT hidden size is 768
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.BatchNorm1d(256)
        )
        
        # Department classifier head
        self.dept_classifier = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, num_departments)
        )
        
        # Type classifier head
        self.type_classifier = nn.Sequential(
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_types)
        )
        
        # Priority classifier head
        self.priority_classifier = nn.Sequential(
            nn.Linear(256, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_priorities)
        )
    
    def forward(self, input_ids, attention_mask):
        """
        Forward pass through the model.
        
        Args:
            input_ids: Tokenized input IDs
            attention_mask: Attention mask for padding
            
        Returns:
            Tuple of (dept_logits, type_logits, priority_logits)
        """
        # Get BERT embeddings (frozen)
        with torch.no_grad() if not self.training else torch.enable_grad():
            outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
            # Use [CLS] token representation
            cls_output = outputs.last_hidden_state[:, 0, :]  # Shape: (batch_size, 768)
        
        # Shared features
        features = self.shared_layer(cls_output)
        
        # Multi-task outputs
        dept_logits = self.dept_classifier(features)
        type_logits = self.type_classifier(features)
        priority_logits = self.priority_classifier(features)
        
        return dept_logits, type_logits, priority_logits


class TicketClassifierService:
    """
    Service class for ticket classification with DistilBERT.
    Handles model loading, prediction, and confidence scoring.
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize the classifier service.
        
        Args:
            model_path: Path to the trained model directory
        """
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.tokenizer = None
        self.label_encoders = {}
        self.class_weights = {}
        
        if model_path:
            self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """Load trained model and associated artifacts."""
        model_path = Path(model_path)
        
        # Load model
        self.model = DistilBERTClassifier()
        self.model.load_state_dict(torch.load(model_path / 'model.pt', map_location=self.device))
        self.model.to(self.device)
        self.model.eval()
        
        # Load tokenizer
        self.tokenizer = DistilBertTokenizer.from_pretrained(str(model_path / 'tokenizer'))
        
        # Load label encoders
        self.label_encoders = joblib.load(model_path / 'label_encoders.pkl')
        
        # Load class weights (optional)
        weights_path = model_path / 'class_weights.pkl'
        if weights_path.exists():
            self.class_weights = joblib.load(weights_path)
    
    def save_model(self, model_path: str):
        """Save model and associated artifacts."""
        model_path = Path(model_path)
        model_path.mkdir(parents=True, exist_ok=True)
        
        # Save model state dict
        torch.save(self.model.state_dict(), model_path / 'model.pt')
        
        # Save tokenizer
        self.tokenizer.save_pretrained(str(model_path / 'tokenizer'))
        
        # Save label encoders
        joblib.dump(self.label_encoders, model_path / 'label_encoders.pkl')
        
        # Save class weights
        if self.class_weights:
            joblib.dump(self.class_weights, model_path / 'class_weights.pkl')
    
    def predict(self, ticket_text: str, return_confidence: bool = True) -> Dict:
        """
        Classify a single ticket.
        
        Args:
            ticket_text: Combined ticket title and description
            return_confidence: Whether to return confidence scores
            
        Returns:
            Dictionary with predictions and confidence scores
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Tokenize input
        inputs = self.tokenizer(
            ticket_text,
            return_tensors='pt',
            max_length=512,
            truncation=True,
            padding=True
        )
        
        input_ids = inputs['input_ids'].to(self.device)
        attention_mask = inputs['attention_mask'].to(self.device)
        
        # Get predictions
        with torch.no_grad():
            dept_logits, type_logits, priority_logits = self.model(input_ids, attention_mask)
            
            # Get predicted classes
            dept_pred = torch.argmax(dept_logits, dim=1).item()
            type_pred = torch.argmax(type_logits, dim=1).item()
            priority_pred = torch.argmax(priority_logits, dim=1).item()
            
            # Get confidence scores (softmax probabilities)
            dept_probs = torch.softmax(dept_logits, dim=1)
            type_probs = torch.softmax(type_logits, dim=1)
            priority_probs = torch.softmax(priority_logits, dim=1)
            
            dept_conf = dept_probs.max().item()
            type_conf = type_probs.max().item()
            priority_conf = priority_probs.max().item()
        
        # Decode predictions
        department = self.label_encoders['department'].inverse_transform([dept_pred])[0]
        ticket_type = self.label_encoders['type'].inverse_transform([type_pred])[0]
        priority = self.label_encoders['priority'].inverse_transform([priority_pred])[0]
        
        # Calculate average confidence
        avg_confidence = (dept_conf + type_conf + priority_conf) / 3
        
        result = {
            'department': department,
            'type': ticket_type,
            'priority': priority,
            'confidence': avg_confidence,
            'classifier_used': 'bert'
        }
        
        if return_confidence:
            result.update({
                'dept_confidence': dept_conf,
                'type_confidence': type_conf,
                'priority_confidence': priority_conf
            })
        
        return result
    
    def predict_batch(self, ticket_texts: List[str]) -> List[Dict]:
        """
        Classify multiple tickets in batch.
        
        Args:
            ticket_texts: List of combined ticket texts
            
        Returns:
            List of prediction dictionaries
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load_model() first.")
        
        # Tokenize all inputs
        inputs = self.tokenizer(
            ticket_texts,
            return_tensors='pt',
            max_length=512,
            truncation=True,
            padding=True
        )
        
        input_ids = inputs['input_ids'].to(self.device)
        attention_mask = inputs['attention_mask'].to(self.device)
        
        # Get predictions
        with torch.no_grad():
            dept_logits, type_logits, priority_logits = self.model(input_ids, attention_mask)
            
            # Get predicted classes
            dept_preds = torch.argmax(dept_logits, dim=1).cpu().numpy()
            type_preds = torch.argmax(type_logits, dim=1).cpu().numpy()
            priority_preds = torch.argmax(priority_logits, dim=1).cpu().numpy()
            
            # Get confidence scores
            dept_probs = torch.softmax(dept_logits, dim=1).cpu().numpy()
            type_probs = torch.softmax(type_logits, dim=1).cpu().numpy()
            priority_probs = torch.softmax(priority_logits, dim=1).cpu().numpy()
        
        # Decode predictions
        results = []
        for i in range(len(ticket_texts)):
            department = self.label_encoders['department'].inverse_transform([dept_preds[i]])[0]
            ticket_type = self.label_encoders['type'].inverse_transform([type_preds[i]])[0]
            priority = self.label_encoders['priority'].inverse_transform([priority_preds[i]])[0]
            
            dept_conf = dept_probs[i].max()
            type_conf = type_probs[i].max()
            priority_conf = priority_probs[i].max()
            avg_confidence = (dept_conf + type_conf + priority_conf) / 3
            
            results.append({
                'department': department,
                'type': ticket_type,
                'priority': priority,
                'confidence': avg_confidence,
                'dept_confidence': dept_conf,
                'type_confidence': type_conf,
                'priority_confidence': priority_conf,
                'classifier_used': 'bert'
            })
        
        return results


# Global classifier instance (lazy loaded)
_classifier_instance = None

def get_classifier(model_path: str = 'models/bert_classifier') -> TicketClassifierService:
    """Get or create the global classifier instance."""
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = TicketClassifierService(model_path)
    return _classifier_instance
