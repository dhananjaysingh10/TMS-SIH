import pandas as pd
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
LOG = logging.getLogger("DataAnalyzer")

def analyze_labels():
    file1 = "Data/powergrid_comprehensive_tickets.csv"
    file2 = "Data/tickets_split_05_with_departments (1).csv"
    
    df1 = pd.read_csv(file1)
    df2 = pd.read_csv(file2)
    
    # Get unique labels
    labels1 = set(df1['Department'].dropna().str.strip().unique())
    labels2 = set(df2['Department'].dropna().str.strip().unique())
    
    intersection = labels1.intersection(labels2)
    only_in_1 = labels1 - labels2
    only_in_2 = labels2 - labels1
    
    LOG.info(f"📊 Dataset 1 (PowerGrid): {len(labels1)} Departments")
    LOG.info(f"📊 Dataset 2 (New File):  {len(labels2)} Departments")
    
    LOG.info("\n✅ Common Departments:")
    for l in sorted(intersection): LOG.info(f"   - {l}")
    
    LOG.info("\nWarning: ⚠️ Departments ONLY in PowerGrid:")
    for l in sorted(only_in_1): LOG.info(f"   - {l}")
    
    LOG.info("\nWarning: ⚠️ Departments ONLY in New File:")
    for l in sorted(only_in_2): LOG.info(f"   - {l}")

if __name__ == "__main__":
    analyze_labels()
