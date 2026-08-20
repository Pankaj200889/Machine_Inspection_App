import json
import os

input_file = r'C:\Users\Pankaj Vishwakarma\.gemini\antigravity\scratch\machine-checklist-app\all_excels_summary.json'
output_file = r'C:\Users\Pankaj Vishwakarma\.gemini\antigravity\scratch\machine-checklist-app\final_templates.json'

with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

templates = []

for filename, rows in data.items():
    doc_no = ""
    for r in rows:
        r_strs = [str(c).strip() for c in r if c is not None]
        for idx, val in enumerate(r_strs):
            if "FRM/" in val or "DOC" in val.upper():
                doc_no = val
                if "DOC" in val.upper() and idx + 1 < len(r_strs):
                     doc_no = r_strs[idx+1]
                break
        if doc_no: break

    name = filename.rsplit('.', 1)[0]
    
    check_point_col = -1
    for r_idx, r in enumerate(rows):
        for c_idx, c in enumerate(r):
            val = str(c).strip().lower() if c is not None else ""
            if any(k in val for k in ["check point", "dwm points", "safety point", "poka yoke"]):
                check_point_col = c_idx
                break
        if check_point_col != -1:
            break
            
    sections_dict = {"General": []}
    current_section = "General"
    
    if check_point_col != -1:
        for r in rows:
            if len(r) > check_point_col:
                cp_val = r[check_point_col]
                if cp_val and isinstance(cp_val, str) and len(cp_val.strip()) > 4 and not any(k in cp_val.lower() for k in ["check point", "dwm points", "safety point", "poka yoke", "rev. ", "history", "revision"]):
                    if check_point_col > 0:
                        sec_val = r[check_point_col - 1]
                        if sec_val and isinstance(sec_val, str) and len(sec_val.strip()) > 2 and not sec_val.strip().isdigit():
                             current_section = sec_val.strip()
                    
                    if current_section not in sections_dict:
                        sections_dict[current_section] = []
                    
                    input_type = "numeric" if any(k in cp_val.lower() for k in ["size", "temp", "pressure", "mpa", "kg", "mm", "speed"]) else "boolean"
                        
                    sections_dict[current_section].append({
                        "check_point": cp_val.strip(),
                        "input_type": input_type
                    })
    else:
        # Fallback for logs/other sheets
        for r in rows:
            for c in r:
                if c and isinstance(c, str) and len(c.strip()) > 20 and "Revision" not in c and "Check" not in c and "Upload" not in c:
                    sections_dict["General"].append({
                        "check_point": c.strip(),
                        "input_type": "boolean"
                    })
                    break

    sections = [{"name": sec_name, "items": items} for sec_name, items in sections_dict.items() if items]
            
    if sections:
        templates.append({
            "name": name,
            "doc_no": doc_no,
            "freq": "Daily",
            "sections": sections
        })

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(templates, f, indent=2, ensure_ascii=False)

print(f"Successfully generated {output_file}")
