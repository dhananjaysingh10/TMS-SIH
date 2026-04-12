import glob
import os
import re

# Path relative to project root
data_path = "server/ticket-triage-service/Data/Products"

# Find all team_*.txt files
files = glob.glob(os.path.join(data_path, "*", "team_*", "*.txt"))
print(f"Found {len(files)} team configuration files.")
print("-" * 50)

products = {}

for f in sorted(files):
    try:
        # Extract Product folder name (e.g. Product_1)
        # Path: .../Data/Products/Product_1/team_1/team_1.txt
        parts = f.split(os.sep)
        product_dir = parts[-3]
        
        with open(f, 'r', encoding='utf-8') as r:
            content = r.read()
            
        # Extract name using regex
        match = re.search(r"name=(.*)", content)
        team_name = match.group(1).strip() if match else "Unknown Team"
        
        if product_dir not in products:
            products[product_dir] = []
        products[product_dir].append(team_name)
            
    except Exception as e:
        print(f"Error reading {f}: {e}")

# Product Mapping (Hardcoded in product_detector.py)
product_map = {
    "Product_1": "e-Tendering Portal",
    "Product_2": "SAP ERP System"
}

for p_dir, teams in products.items():
    p_name = product_map.get(p_dir, p_dir)
    print(f"\n📦 PRODUCT: {p_name} ({p_dir})")
    for t in teams:
        print(f"   ├─ 👥 {t}")
