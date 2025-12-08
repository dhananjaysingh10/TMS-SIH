import pandas as pd
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
LOG = logging.getLogger("DataMerger")

def merge_files():
    # 1. Paths
    file1 = "Data/powergrid_comprehensive_tickets.csv"
    file2 = "Data/tickets_split_05_with_departments (1).csv"
    output_file = "Data/merged_training_data.csv"
    
    # 2. Load
    LOG.info(f"📂 Loading {file1}...")
    df1 = pd.read_csv(file1)
    
    LOG.info(f"📂 Loading {file2}...")
    df2 = pd.read_csv(file2)
    
    # 3. Standardization
    # DF1 has: Query_Text, Keywords, Department
    # DF2 has: ticket_content, Department
    
    # Standardize DF1
    df1['text'] = df1['Query_Text'] + " " + df1['Keywords'].fillna('')
    df1 = df1[['text', 'Department']]
    
    # Standardize DF2
    df2['text'] = df2['ticket_content']
    df2 = df2[['text', 'Department']]
    
    # 4. Merge
    merged_df = pd.concat([df1, df2], ignore_index=True)
    
    # 5. Clean
    merged_df.dropna(inplace=True)
    merged_df.drop_duplicates(subset=['text'], inplace=True)
    
    # 6. Save
    merged_df.to_csv(output_file, index=False)
    
    LOG.info("="*30)
    LOG.info(f"🎉 Merge Complete!")
    LOG.info(f"   Original Rows: {len(df1)} + {len(df2)}")
    LOG.info(f"   Merged Rows:   {len(merged_df)}")
    LOG.info(f"   Saved to:      {output_file}")
    LOG.info("="*30)

if __name__ == "__main__":
    merge_files()
