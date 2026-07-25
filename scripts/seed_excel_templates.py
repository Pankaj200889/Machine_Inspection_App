import os
import sqlite3
import pandas as pd
import re

TEMPLATE_CONFIGS = {
    "01 YL1 OT  DD1 18mPm.xlsx": {
        "template_name": "Extrusion Process Parameter Sheet (YL1 OT)",
        "doc_no": "FRM/PR-EXT/01",
        "rev_no": "01",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 4,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4,
            "responsibility": 5
        }
    },
    "100 Fire safety DD1  Revised 01.Aug.2025.xlsx": {
        "template_name": "CO2 Flooding System Fire Safety Check Sheet",
        "doc_no": "FRM/PR-EXT/100",
        "rev_no": "01",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 3,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "106 DWM Extrusion Engineer.xlsx": {
        "template_name": "Daily Work Management (DWM) Extrusion Engineer",
        "doc_no": "FRM/PR-EXT/106",
        "rev_no": "00",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 2,
        "cols": {
            "section": 4,
            "check_point": 1,
            "specification": 2,
            "checking_method": 5
        }
    },
    "111 COMPOUND CONSUMPTION DETAIL DD1,2,3,GR1,2.xlsx": {
        "template_name": "Compound Consumption Detail",
        "doc_no": "FRM/PR-EXT/111",
        "rev_no": "00",
        "rev_date": "13.08.2025",
        "sheet_index": 0,
        "header_row": 4,
        "cols": {
            "section": 0,
            "check_point": 4,
            "specification": 5,
            "checking_method": 7
        }
    },
    "113 INSERT MANAGEMANT.xlsx": {
        "template_name": "Insert Slitting Management Sheet",
        "doc_no": "FRM/PR-EXT/113",
        "rev_no": "00",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 6,
        "cols": {
            "section": 0,
            "check_point": 3,
            "specification": 9,
            "checking_method": 7
        }
    },
    "122 Shift engineer check point.xlsx": {
        "template_name": "Extrusion Shift Engineer Check Sheet",
        "doc_no": "FRM/PR-EXT/122",
        "rev_no": "00",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 2,
        "cols": {
            "section": 0,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "76 DAILY PRODUCTION LOG SHEET.xlsx": {
        "template_name": "Daily Production Log Sheet",
        "doc_no": "FRM/PR-EXT/76",
        "rev_no": "00",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 3,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "78 ONLINE INSPECTION DD1,2,3 GR1,2.xlsx": {
        "template_name": "Online Quality Inspection Sheet",
        "doc_no": "FRM/PR-EXT/78",
        "rev_no": "00",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 4,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "79 DPR ALL LINE.xlsx": {
        "template_name": "Daily Production Report (All Lines)",
        "doc_no": "FRM/PR-EXT/79",
        "rev_no": "00",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 3,
        "cols": {
            "section": 0,
            "check_point": 1,
            "specification": 2,
            "checking_method": 3
        }
    },
    "80 shadowgraph check sheet all line.xlsx": {
        "template_name": "Shadowgraph Precision Profilometry Sheet",
        "doc_no": "FRM/PR-EXT/80",
        "rev_no": "00",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 5,
        "cols": {
            "section": 0,
            "check_point": 1,
            "specification": 2,
            "checking_method": 3
        }
    },
    "81 DD1 Machine check sheet.xlsx": {
        "template_name": "DD1 Machine Startup Check Sheet",
        "doc_no": "FRM/PR-EXT/81",
        "rev_no": "00",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 4,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "96 AQ 06 chemical Check Sheet.xlsx": {
        "template_name": "Chemical Concentration Mixing Check Sheet",
        "doc_no": "FRM/PR-EXT/96",
        "rev_no": "00",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 3,
        "cols": {
            "section": 0,
            "check_point": 1,
            "specification": 3,
            "checking_method": 4
        }
    },
    "99 Poke Yoke Verification Revised 01.Aug.2025.xlsx": {
        "template_name": "Poka-Yoke Error Proofing Sheet",
        "doc_no": "FRM/PR-EXT/99",
        "rev_no": "01",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 3,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "updated_excel_68ad54746eace_06  4M change Tracking sheet.xlsx": {
        "template_name": "4M Process Change Tracking Sheet",
        "doc_no": "FRM/PR-EXT/06",
        "rev_no": "00",
        "rev_date": "01.08.2025",
        "sheet_index": 0,
        "header_row": 3,
        "cols": {
            "section": 1,
            "check_point": 3,
            "specification": 4,
            "checking_method": 5
        }
    }
}

def parse_specification(spec_str):
    if not spec_str or pd.isna(spec_str):
        return None, None
    spec_str = str(spec_str).strip()
    
    # Check for ± pattern (e.g., 60±5 or 0.2 ± 0.02)
    plus_minus_match = re.search(r'(\d+(?:\.\d+)?)\s*[±±]\s*(\d+(?:\.\d+)?)', spec_str)
    if plus_minus_match:
        val = float(plus_minus_match.group(1))
        tol = float(plus_minus_match.group(2))
        return val - tol, val + tol
        
    # Check for range pattern (e.g., 70-76)
    range_match = re.search(r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)', spec_str)
    if range_match:
        val1 = float(range_match.group(1))
        val2 = float(range_match.group(2))
        return min(val1, val2), max(val1, val2)
        
    return None, None

def seed_db():
    src_dir = "./checklists_review"
    db_path = "./server/machines.db"
    
    print(f"Connecting to SQLite database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Clean up old data to prevent duplicate seeds
    cursor.execute("DELETE FROM machine_templates")
    cursor.execute("DELETE FROM template_items")
    cursor.execute("DELETE FROM template_sections")
    cursor.execute("DELETE FROM checklist_templates")
    conn.commit()
    
    files = [f for f in os.listdir(src_dir)]
    
    for f in files:
        # Match filenames loosely or strictly
        matched_config_key = None
        for key in TEMPLATE_CONFIGS:
            if key in f or f in key:
                matched_config_key = key
                break
                
        if not matched_config_key:
            print(f"Skipping unmapped file: {f}")
            continue
            
        config = TEMPLATE_CONFIGS[matched_config_key]
        filepath = os.path.join(src_dir, f)
        print(f"Ingesting checklist: {config['template_name']}")
        
        try:
            xl = pd.ExcelFile(filepath)
            sheet_name = config.get("sheet_name")
            if not sheet_name:
                sheet_name = xl.sheet_names[config.get("sheet_index", 0)]
                
            df = xl.parse(sheet_name)
            
            # Insert Template
            cursor.execute("""
                INSERT INTO checklist_templates (template_name, doc_no, rev_no, rev_date, frequency)
                VALUES (?, ?, ?, ?, ?)
            """, (config['template_name'], config['doc_no'], config['rev_no'], config['rev_date'], 'shift-wise'))
            template_id = cursor.lastrowid
            
            # --- SPECIAL PARSERS ---
            
            # 1. Compound Consumption Detail
            if "compound" in f.lower() or "consumption" in f.lower():
                sections = ["90 MM Extruder", "70 MM Extruder", "50 MM Extruder"]
                params = ["Batch No", "Mixing Date", "Expiry Date", "Compound Qty In Kg", "Used Qty In kg", "Remarks"]
                
                item_order = 0
                for sec in sections:
                    cursor.execute("INSERT INTO template_sections (template_id, section_name, order_index) VALUES (?, ?, ?)",
                                   (template_id, sec, sections.index(sec)))
                    section_id = cursor.lastrowid
                    for p in params:
                        cursor.execute("""
                            INSERT INTO template_items (section_id, check_point, input_type, order_index)
                            VALUES (?, ?, ?, ?)
                        """, (section_id, p, "text", item_order))
                        item_order += 1
                print(f"  -> Added {len(sections)} sections and {item_order} parameters (Custom Material Log).")
                continue
                
            # 2. Daily Production Log Sheet (Hourly Production)
            elif "production log" in f.lower() or "daily production" in f.lower():
                cursor.execute("INSERT INTO template_sections (template_id, section_name, order_index) VALUES (?, ?, ?)",
                               (template_id, "Hourly Production Log", 0))
                section_id = cursor.lastrowid
                
                hours = ["Hour 1", "Hour 2", "Hour 3", "Hour 4", "Hour 5", "Hour 6", "Hour 7", "Hour 8"]
                metrics = ["Part Name", "Actual Qty", "Scrap Qty", "Downtime Reason"]
                
                item_order = 0
                for h in hours:
                    for m in metrics:
                        input_type = "numeric" if "qty" in m.lower() else "text"
                        cursor.execute("""
                            INSERT INTO template_items (section_id, check_point, input_type, order_index)
                            VALUES (?, ?, ?, ?)
                        """, (section_id, f"{h} - {m}", input_type, item_order))
                        item_order += 1
                print(f"  -> Added 1 section and {item_order} parameters (Custom Production Log).")
                continue
                
            # 3. Online Quality Defect Sheet
            elif "online inspection" in f.lower():
                cursor.execute("INSERT INTO template_sections (template_id, section_name, order_index) VALUES (?, ?, ?)",
                               (template_id, "Defect Logging", 0))
                section_id = cursor.lastrowid
                
                hours = ["Hour 1", "Hour 2", "Hour 3", "Hour 4", "Hour 5", "Hour 6", "Hour 7", "Hour 8"]
                defects = ["Cure Bit/Scratch", "Contamination", "Air Bubble", "Blister", "Sponge Problem", "Silicon/PU Issue"]
                
                item_order = 0
                for h in hours:
                    for d in defects:
                        cursor.execute("""
                            INSERT INTO template_items (section_id, check_point, input_type, order_index)
                            VALUES (?, ?, ?, ?)
                        """, (section_id, f"{h} - {d}", "numeric", item_order))
                        item_order += 1
                print(f"  -> Added 1 section and {item_order} parameters (Custom Quality Log).")
                continue
                
            # --- GENERIC GRID PARSER ---
            header_row = config['header_row']
            df_rows = df.iloc[header_row+1:]
            
            current_section_name = "General Setup"
            cursor.execute("""
                INSERT INTO template_sections (template_id, section_name, order_index)
                VALUES (?, ?, ?)
            """, (template_id, current_section_name, 0))
            section_id = cursor.lastrowid
            
            sections = {current_section_name: section_id}
            item_order = 0
            
            for idx, row in df_rows.iterrows():
                cols = config['cols']
                
                # Check point is mandatory
                if cols['check_point'] >= len(row):
                    continue
                cp_val = row.iloc[cols['check_point']]
                if pd.isna(cp_val) or str(cp_val).strip() == "" or str(cp_val).lower().startswith("nan"):
                    continue
                
                check_point = str(cp_val).strip()
                
                # Section mapping
                if cols['section'] < len(row):
                    sec_val = row.iloc[cols['section']]
                    if not pd.isna(sec_val) and str(sec_val).strip() != "":
                        new_sec_name = str(sec_val).strip()
                        if new_sec_name not in sections:
                            cursor.execute("""
                                INSERT INTO template_sections (template_id, section_name, order_index)
                                VALUES (?, ?, ?)
                            """, (template_id, new_sec_name, len(sections)))
                            sections[new_sec_name] = cursor.lastrowid
                        current_section_name = new_sec_name
                        section_id = sections[current_section_name]
                
                # Specification
                spec = ""
                if 'specification' in cols and cols['specification'] < len(row):
                    spec_val = row.iloc[cols['specification']]
                    spec = str(spec_val).strip() if not pd.isna(spec_val) else ""
                
                # Checking method
                method = ""
                if 'checking_method' in cols and cols['checking_method'] < len(row):
                    method_val = row.iloc[cols['checking_method']]
                    method = str(method_val).strip() if not pd.isna(method_val) else ""
                
                # Responsibility
                resp = "Operator"
                if 'responsibility' in cols and cols['responsibility'] < len(row):
                    resp_val = row.iloc[cols['responsibility']]
                    resp = str(resp_val).strip() if not pd.isna(resp_val) else "Operator"
                
                # Parse numeric thresholds
                expected_min, expected_max = parse_specification(spec)
                input_type = "numeric" if expected_min is not None else "boolean"
                
                # Insert Template Item
                cursor.execute("""
                    INSERT INTO template_items (
                        section_id, check_point, specification, checking_method, 
                        responsibility, input_type, expected_min, expected_max, order_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (section_id, check_point, spec, method, resp, input_type, expected_min, expected_max, item_order))
                item_order += 1
                
            print(f"  -> Added {len(sections)} sections and {item_order} parameters.")
            
        except Exception as e:
            print(f"Error parsing file {f}: {e}")
            
    # Associate all templates with all machines
    print("Associating templates with all machines...")
    cursor.execute("SELECT id FROM machines")
    machines = [row[0] for row in cursor.fetchall()]
    
    cursor.execute("SELECT id FROM checklist_templates")
    templates = [row[0] for row in cursor.fetchall()]
    
    for m_id in machines:
        for t_id in templates:
            cursor.execute("""
                INSERT OR IGNORE INTO machine_templates (machine_id, template_id)
                VALUES (?, ?)
            """, (m_id, t_id))
            
    conn.commit()
    conn.close()
    print("Seeding Complete!")

if __name__ == "__main__":
    seed_db()
