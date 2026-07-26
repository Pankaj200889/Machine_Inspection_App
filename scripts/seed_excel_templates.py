import os
import sqlite3
import pandas as pd
import re

# Conditional import for Postgres
is_postgres = False
database_url = os.getenv("DATABASE_URL")
if database_url:
    database_url = database_url.strip()

if database_url and database_url.startswith("postgres"):
    try:
        import psycopg2
        is_postgres = True
    except ImportError:
        print("psycopg2 is not installed. Falling back to SQLite.")

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
        "rev_no": "01",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 2
    },
    "113 INSERT MANAGEMANT.xlsx": {
        "template_name": "Insert Slitting Management Sheet",
        "doc_no": "FRM/PR-EXT/113",
        "rev_no": "00",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 3,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "122 Shift engineer check point.xlsx": {
        "template_name": "Extrusion Shift Engineer Check Sheet",
        "doc_no": "FRM/PR-EXT/122",
        "rev_no": "00",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 2,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "76 DAILY PRODUCTION LOG SHEET.xlsx": {
        "template_name": "Daily Production Log Sheet",
        "doc_no": "FRM/PR-EXT/76",
        "rev_no": "00",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 2
    },
    "78 ONLINE INSPECTION DD1,2,3 GR1,2.xlsx": {
        "template_name": "Online Quality Inspection Sheet",
        "doc_no": "FRM/PR-EXT/78",
        "rev_no": "00",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 2
    },
    "79 DPR ALL LINE.xlsx": {
        "template_name": "Daily Production Report (All Lines)",
        "doc_no": "FRM/PR-EXT/79",
        "rev_no": "00",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 2,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "80 shadowgraph check sheet all line.xlsx": {
        "template_name": "Shadowgraph Precision Profilometry Sheet",
        "doc_no": "FRM/PR-EXT/80",
        "rev_no": "00",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 3,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "81 DD1 Machine Startup check sheet.xlsx": {
        "template_name": "DD1 Machine Startup Check Sheet",
        "doc_no": "FRM/PR-EXT/81",
        "rev_no": "00",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 3,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 3,
            "checking_method": 4
        }
    },
    "96 AQ 06 chemical Check Sheet.xlsx": {
        "template_name": "Chemical Concentration Mixing Check Sheet",
        "doc_no": "FRM/QA/96",
        "rev_no": "00",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 2,
        "cols": {
            "section": 1,
            "check_point": 2,
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
        "rev_no": "01",
        "rev_date": "16.01.2026",
        "sheet_index": 0,
        "header_row": 4,
        "cols": {
            "section": 1,
            "check_point": 2,
            "specification": 4,
            "checking_method": 5
        }
    }
}

def parse_specification(spec_str):
    if not spec_str or pd.isna(spec_str):
        return None, None
    spec_str = str(spec_str).strip()
    
    plus_minus_match = re.search(r'(\d+(?:\.\d+)?)\s*[±±]\s*(\d+(?:\.\d+)?)', spec_str)
    if plus_minus_match:
        val = float(plus_minus_match.group(1))
        tol = float(plus_minus_match.group(2))
        return val - tol, val + tol
        
    range_match = re.search(r'(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)', spec_str)
    if range_match:
        val1 = float(range_match.group(1))
        val2 = float(range_match.group(2))
        return min(val1, val2), max(val1, val2)
        
    return None, None

def execute_query(cursor, query_str, params=None):
    if is_postgres:
        query_str = query_str.replace("?", "%s")
        query_str = re.sub(
            r'INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)\s*\((.*?)\)\s*VALUES\s*\((.*?)\)',
            r'INSERT INTO \1 (\2) VALUES (\3) ON CONFLICT DO NOTHING',
            query_str,
            flags=re.IGNORECASE | re.DOTALL
        )
        cursor.execute(query_str, params)
    else:
        cursor.execute(query_str, params)

def insert_and_get_id(cursor, query_str, params=None):
    if is_postgres:
        query_str = query_str.replace("?", "%s")
        query_str += " RETURNING id"
        cursor.execute(query_str, params)
        return cursor.fetchone()[0]
    else:
        cursor.execute(query_str, params)
        return cursor.lastrowid

def seed_db():
    src_dir = "./checklists_review"
    
    if is_postgres:
        print(f"Connecting to PostgreSQL database: {database_url}")
        conn = psycopg2.connect(database_url, sslmode='require')
    else:
        db_path = "./server/machines.db"
        print(f"Connecting to SQLite database: {db_path}")
        conn = sqlite3.connect(db_path)
        
    cursor = conn.cursor()
    
    if is_postgres:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checklist_templates (
                id SERIAL PRIMARY KEY,
                template_name TEXT NOT NULL,
                doc_no TEXT,
                rev_no TEXT DEFAULT '00',
                rev_date TEXT,
                frequency TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS template_sections (
                id SERIAL PRIMARY KEY,
                template_id INTEGER REFERENCES checklist_templates(id) ON DELETE CASCADE,
                section_name TEXT NOT NULL,
                order_index INTEGER DEFAULT 0
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS template_items (
                id SERIAL PRIMARY KEY,
                section_id INTEGER REFERENCES template_sections(id) ON DELETE CASCADE,
                check_point TEXT NOT NULL,
                specification TEXT,
                checking_method TEXT,
                responsibility TEXT DEFAULT 'Operator',
                input_type TEXT DEFAULT 'boolean',
                expected_min REAL,
                expected_max REAL,
                is_mandatory INTEGER DEFAULT 1,
                order_index INTEGER DEFAULT 0
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checklist_submissions (
                id SERIAL PRIMARY KEY,
                template_id INTEGER REFERENCES checklist_templates(id),
                machine_id INTEGER REFERENCES machines(id),
                user_id INTEGER REFERENCES users(id),
                shift TEXT NOT NULL,
                part_name TEXT,
                line_speed TEXT,
                checked_by INTEGER REFERENCES users(id),
                checked_at TIMESTAMP,
                approved_by INTEGER REFERENCES users(id),
                approved_at TIMESTAMP,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS checklist_submission_values (
                id SERIAL PRIMARY KEY,
                submission_id INTEGER REFERENCES checklist_submissions(id) ON DELETE CASCADE,
                item_id INTEGER REFERENCES template_items(id),
                actual_value TEXT,
                is_ok INTEGER DEFAULT 1,
                remarks TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS machine_templates (
                machine_id INTEGER REFERENCES machines(id) ON DELETE CASCADE,
                template_id INTEGER REFERENCES checklist_templates(id) ON DELETE CASCADE,
                PRIMARY KEY (machine_id, template_id)
            )
        """)
        
        # Alter checklists table to add submission_id if not exists
        try:
            cursor.execute("ALTER TABLE checklists ADD COLUMN IF NOT EXISTS submission_id INTEGER")
        except Exception:
            pass
            
        conn.commit()
    
    # Clean up old templates data to prevent duplicate seeds
    execute_query(cursor, "DELETE FROM machine_templates")
    execute_query(cursor, "DELETE FROM template_items")
    execute_query(cursor, "DELETE FROM template_sections")
    execute_query(cursor, "DELETE FROM checklist_templates")
    conn.commit()
    
    files = [f for f in os.listdir(src_dir)]
    
    for f in files:
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
            
            template_id = insert_and_get_id(cursor, """
                INSERT INTO checklist_templates (template_name, doc_no, rev_no, rev_date, frequency)
                VALUES (?, ?, ?, ?, ?)
            """, (config['template_name'], config['doc_no'], config['rev_no'], config['rev_date'], 'shift-wise'))
            
            # --- SPECIAL PARSERS ---
            
            # 1. Compound Consumption Detail
            if "compound" in f.lower() or "consumption" in f.lower():
                sections = ["90 MM Extruder", "70 MM Extruder", "50 MM Extruder"]
                params = ["Batch No", "Mixing Date", "Expiry Date", "Compound Qty In Kg", "Used Qty In kg", "Remarks"]
                
                item_order = 0
                for sec in sections:
                    section_id = insert_and_get_id(cursor, "INSERT INTO template_sections (template_id, section_name, order_index) VALUES (?, ?, ?)",
                                   (template_id, sec, sections.index(sec)))
                    for p in params:
                        execute_query(cursor, """
                            INSERT INTO template_items (section_id, check_point, input_type, order_index)
                            VALUES (?, ?, ?, ?)
                        """, (section_id, p, "text", item_order))
                        item_order += 1
                print(f"  -> Added {len(sections)} sections and {item_order} parameters (Custom Material Log).")
                continue
                
            # 2. Daily Production Log Sheet
            elif "production log" in f.lower() or "daily production" in f.lower():
                section_id = insert_and_get_id(cursor, "INSERT INTO template_sections (template_id, section_name, order_index) VALUES (?, ?, ?)",
                               (template_id, "Hourly Production Log", 0))
                
                hours = ["Hour 1", "Hour 2", "Hour 3", "Hour 4", "Hour 5", "Hour 6", "Hour 7", "Hour 8"]
                metrics = ["Part Name", "Actual Qty", "Scrap Qty", "Downtime Reason"]
                
                item_order = 0
                for h in hours:
                    for m in metrics:
                        input_type = "numeric" if "qty" in m.lower() else "text"
                        execute_query(cursor, """
                            INSERT INTO template_items (section_id, check_point, input_type, order_index)
                            VALUES (?, ?, ?, ?)
                        """, (section_id, f"{h} - {m}", input_type, item_order))
                        item_order += 1
                print(f"  -> Added 1 section and {item_order} parameters (Custom Production Log).")
                continue
                
            # 3. Online Quality Defect Sheet
            elif "online inspection" in f.lower():
                section_id = insert_and_get_id(cursor, "INSERT INTO template_sections (template_id, section_name, order_index) VALUES (?, ?, ?)",
                               (template_id, "Defect Logging", 0))
                
                hours = ["Hour 1", "Hour 2", "Hour 3", "Hour 4", "Hour 5", "Hour 6", "Hour 7", "Hour 8"]
                defects = ["Cure Bit/Scratch", "Contamination", "Air Bubble", "Blister", "Sponge Problem", "Silicon/PU Issue"]
                
                item_order = 0
                for h in hours:
                    for d in defects:
                        execute_query(cursor, """
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
            section_id = insert_and_get_id(cursor, """
                INSERT INTO template_sections (template_id, section_name, order_index)
                VALUES (?, ?, ?)
            """, (template_id, current_section_name, 0))
            
            sections = {current_section_name: section_id}
            item_order = 0
            
            for idx, row in df_rows.iterrows():
                cols = config['cols']
                
                if cols['check_point'] >= len(row):
                    continue
                cp_val = row.iloc[cols['check_point']]
                if pd.isna(cp_val) or str(cp_val).strip() == "" or str(cp_val).lower().startswith("nan"):
                    continue
                
                check_point = str(cp_val).strip()
                
                if cols['section'] < len(row):
                    sec_val = row.iloc[cols['section']]
                    if not pd.isna(sec_val) and str(sec_val).strip() != "":
                        new_sec_name = str(sec_val).strip()
                        if new_sec_name not in sections:
                            sections[new_sec_name] = insert_and_get_id(cursor, """
                                INSERT INTO template_sections (template_id, section_name, order_index)
                                VALUES (?, ?, ?)
                            """, (template_id, new_sec_name, len(sections)))
                        current_section_name = new_sec_name
                        section_id = sections[current_section_name]
                
                spec = ""
                if 'specification' in cols and cols['specification'] < len(row):
                    spec_val = row.iloc[cols['specification']]
                    spec = str(spec_val).strip() if not pd.isna(spec_val) else ""
                
                method = ""
                if 'checking_method' in cols and cols['checking_method'] < len(row):
                    method_val = row.iloc[cols['checking_method']]
                    method = str(method_val).strip() if not pd.isna(method_val) else ""
                
                resp = "Operator"
                if 'responsibility' in cols and cols['responsibility'] < len(row):
                    resp_val = row.iloc[cols['responsibility']]
                    resp = str(resp_val).strip() if not pd.isna(resp_val) else "Operator"
                
                expected_min, expected_max = parse_specification(spec)
                input_type = "numeric" if expected_min is not None else "boolean"
                
                execute_query(cursor, """
                    INSERT INTO template_items (
                        section_id, check_point, specification, checking_method, 
                        responsibility, input_type, expected_min, expected_max, order_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (section_id, check_point, spec, method, resp, input_type, expected_min, expected_max, item_order))
                item_order += 1
                
            print(f"  -> Added {len(sections)} sections and {item_order} parameters.")
            
        except Exception as e:
            print(f"Error parsing file {f}: {e}")
            
    print("Associating templates with all machines...")
    cursor.execute("SELECT id FROM machines")
    machines = [row[0] for row in cursor.fetchall()]
    
    cursor.execute("SELECT id FROM checklist_templates")
    templates = [row[0] for row in cursor.fetchall()]
    
    for m_id in machines:
        for t_id in templates:
            execute_query(cursor, """
                INSERT OR IGNORE INTO machine_templates (machine_id, template_id)
                VALUES (?, ?)
            """, (m_id, t_id))
            
    conn.commit()
    conn.close()
    print("Seeding Complete!")

if __name__ == "__main__":
    seed_db()
