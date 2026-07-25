import os
import pandas as pd
import sys

def inspect_excel_files(directory, output_file):
    files = [f for f in os.listdir(directory) if f.endswith('.xlsx') or f.endswith('.xls')]
    
    with open(output_file, 'w', encoding='utf-8') as out:
        out.write(f"Found {len(files)} Excel files in {directory}:\n\n")
        
        for f in files:
            filepath = os.path.join(directory, f)
            out.write("="*60 + "\n")
            out.write(f"FILE: {f}\n")
            out.write("="*60 + "\n")
            try:
                xl = pd.ExcelFile(filepath)
                out.write(f"Sheet names: {xl.sheet_names}\n")
                
                for sheet in xl.sheet_names[:2]: # Inspect first 2 sheets
                    df = xl.parse(sheet)
                    out.write(f"\nSheet: '{sheet}' | Shape: {df.shape}\n")
                    out.write("First 10 rows:\n")
                    # Print non-empty rows/cols for brief overview
                    df_clean = df.dropna(how='all').iloc[:20, :10]
                    out.write(df_clean.to_string() + "\n")
            except Exception as e:
                out.write(f"Error reading file {f}: {e}\n")
            out.write("\n" + "-"*60 + "\n\n")

if __name__ == "__main__":
    inspect_excel_files("./checklists_review", "./checklists_review_output_utf8.txt")

