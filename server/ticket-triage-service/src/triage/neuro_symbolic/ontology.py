import nltk
from nltk.corpus import wordnet
import logging
from typing import List, Set

# Initialize logging
LOG = logging.getLogger("semantic_layer")

class SemanticExpander:
    def __init__(self):
        self._ensure_nltk_resources()
        self.domain_ontology = self._build_domain_ontology()
        
    def _ensure_nltk_resources(self):
        
        try:
            wordnet.ensure_loaded()
        except LookupError:
            LOG.info("📥 Downloading WordNet resources...")
            nltk.download('wordnet')
            nltk.download('omw-1.4')

    def _build_domain_ontology(self) -> dict:
      
        return {
            "vpn": ["network", "connection", "tunnel", "gateway", "access"],
            "wifi": ["network", "internet", "wireless", "signal", "connection"],
            "router": ["network", "switch", "hardware", "infrastructure"],
            "switch": ["network", "port", "hardware", "router"],
            "printer": ["hardware", "peripheral", "device", "paper", "toner"],
            "monitor": ["hardware", "screen", "display", "peripheral"],
            "laptop": ["hardware", "computer", "device", "workstation"],
            "keyboard": ["hardware", "peripheral", "input"],
            "mouse": ["hardware", "peripheral", "input"],
            "sap": ["enterprise", "erp", "software", "business", "application"],
            "salesforce": ["enterprise", "crm", "cloud", "sales"],
            "oracle": ["database", "db", "sql", "enterprise"],
            "postgres": ["database", "db", "sql", "storage"],
            "mysql": ["database", "db", "sql", "storage"],
            "aws": ["cloud", "infrastructure", "ec2", "s3", "lambda"],
            "azure": ["cloud", "infrastructure", "microsoft"],
            "jenkins": ["devops", "ci/cd", "pipeline", "automation", "build"],
            "docker": ["devops", "container", "kubernetes", "image"],
            "kubernetes": ["devops", "k8s", "orchestration", "container"],
            "git": ["devops", "version control", "code", "repository"],
            "bsod": ["desktop", "crash", "windows", "error", "screen"],
            "password": ["identity", "access", "login", "auth", "security"],
            "mfa": ["identity", "security", "auth", "token", "mobile"],
            "phishing": ["security", "threat", "email", "malware", "virus"],
            "malware": ["security", "virus", "threat", "antivirus", "infected"],
            "license": ["software", "activation", "key", "renewal", "vendor"],
        }

    def get_synonyms(self, word: str) -> Set[str]:
        """Get synonyms from WordNet."""
        synonyms = set()
        for syn in wordnet.synsets(word):
            for lemma in syn.lemmas():
                synonyms.add(lemma.name().replace('_', ' '))
        return synonyms

    def expand_text(self, text: str) -> str:
        """
        Expands the input text with:
        1. Domain Ontology Mapping (Symbolic Boost)
        2. WordNet Synonyms (Lexical Boost)
        """
        words = text.lower().split()
        expanded_terms = set(words)
        
        for word in words:
            # 1. Domain Expansion
            if word in self.domain_ontology:
                expanded_terms.update(self.domain_ontology[word])
            
            # 2. WordNet Expansion (Limited to nouns/verbs to avoid noise)
            # In a full system we'd POS tag first, but this is reasonable for keywords
            synonyms = self.get_synonyms(word)
            expanded_terms.update(list(synonyms)[:3]) # Add top 3 synonyms to avoid drift
            
        # Return enriched text
        # We append expansion to original text to keep context
        return " ".join(expanded_terms)

# Global instance
semantic_expander = SemanticExpander()
