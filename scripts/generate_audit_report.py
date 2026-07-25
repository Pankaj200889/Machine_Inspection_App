import os
import pandas as pd
import json

def analyze_checklists():
    src_dir = "./checklists_review"
    dest_file = "C:/Users/Pankaj Vishwakarma/.gemini/antigravity/brain/5b73df36-6d6e-45d9-b1f4-63f22dea20d9/checklists_analysis_report.md"
    
    files = [f for f in os.listdir(src_dir) if f.endswith('.xlsx') or f.endswith('.xls')]
    
    md_content = """# Deep Audit Report: EquipGuard Checklist Digitization Plan

This report provides a detailed breakdown of the 14 Excel checklists provided for migration. It analyzes their structures, operational frequencies, and provides a database-ready schema recommendation to digitalize them.

---

## 1. Executive Summary of Checklist Types

The provided checklists span multiple operational categories:

| File Name / Category | Audit Target | Frequency | Key Data Checked |
| :--- | :--- | :--- | :--- |
| **01 YL1 OT DD1 18mPm.xlsx** | Extrusion Line Setup | Start/End of Run | Extruder temperatures, RPMs, Line Speeds |
| **100 Fire safety DD1 Revised 01.Aug.2025.xlsx** | Safety Systems (CO2 Flooding) | Weekly (Monday/Sat) | Cylinder pressure gauge, valves, leakage |
| **106 DWM Extrusion Engineer.xlsx** | Engineer Daily Management | Daily / Weekly | Setup approvals, FIFO, kaizen, safety audits |
| **111 COMPOUND CONSUMPTION DETAIL** | Raw Material Traceability | Batch-wise | Compound grades, batch weights, expiry dates |
| **113 INSERT MANAGEMENT** | Metal Insert Quality | Every 40 minutes | Insert weight, dimensions before/after slitting |
| **122 Shift engineer check point.xlsx** | Shift Handover / Verification | Shift-wise (A/B/C) | Logbook updates, PPE usage, 2S/1Y, WIP storage |
| **76 DAILY PRODUCTION LOG SHEET.xlsx** | Line Output & Downtime | Hourly / Shift-wise | Part weight, scrap count, downtime logs |
| **78 ONLINE INSPECTION DD1,2,3 GR1,2.xlsx** | Quality Inspections (QC) | Multi-hourly | Part dimensions, lip thickness, appearance |
| **79 DPR ALL LINE.xlsx** | Daily Production Report | Daily | Total volume, OK/NG ratio, operator logs |
| **80 shadowgraph check sheet all line.xlsx** | Precision Profilometry | Batch-wise | 2D dimension mapping of profiles |
| **81 DD1 Machine check sheet.xlsx** | Preventive Maintenance | Daily (Before start) | Air pressure, heaters, water level, emergency stops |
| **96 AQ 06 chemical Check Sheet.xlsx** | Chemical Prep (Silicon Bath) | Every 2 hours | Tank temp, concentration, water level |
| **99 Poke Yoke Verification** | Error-proofing sensors | Shift-wise / Batch | Sensor trigger test (accumulators, cutters, drills) |
| **06 4M change Tracking sheet.xlsx** | Man, Machine, Material, Method Changes | Event-driven | Quality approval logs for process adjustments |

---

## 2. Granular Analysis of Key Checklists

"""

    for f in files:
        filepath = os.path.join(src_dir, f)
        md_content += f"### 📄 {f}\n\n"
        
        try:
            xl = pd.ExcelFile(filepath)
            md_content += f"- **Excel Sheets:** {', '.join([f'`{s}`' for s in xl.sheet_names])}\n"
            
            for sheet in xl.sheet_names[:1]: # Detailed look at the main sheet
                df = xl.parse(sheet)
                md_content += f"- **Primary Sheet Dimensions:** {df.shape[0]} rows × {df.shape[1]} columns\n"
                
                # Try to guess columns/headers
                df_clean = df.dropna(how='all')
                
                md_content += "\n#### Sample Structure / Headings:\n"
                md_content += "```text\n"
                # Grab top 15 rows, limit columns to fit screen
                sample_str = df_clean.iloc[:15, :7].to_string()
                md_content += sample_str + "\n"
                md_content += "```\n\n"
                
                # Extract some keywords to explain digital transition
                md_content += "#### Digital Form Design Strategy:\n"
                if "safety" in f.lower() or "fire" in f.lower():
                    md_content += "- **Form Layout:** Multi-row list with Yes/No checkboxes for pressure, leakages, and valve status.\n"
                    md_content += "- **Auto-alert:** Automatically notify the Safety Manager if any checkbox is marked 'NG' (Not Good).\n"
                elif "temp" in str(df_clean).lower() or "rpm" in str(df_clean).lower() or "spec" in str(df_clean).lower():
                    md_content += "- **Form Layout:** Accordion-styled sections representing each extruder (e.g., 60mm, 70mm, 45mm).\n"
                    md_content += "- **Data Entry:** Real-time numerical input with strict range boundaries (e.g. Alert if Head Temp deviates from 65±5°C).\n"
                elif "poka" in f.lower() or "poke" in f.lower():
                    md_content += "- **Form Layout:** Binary Verification form (e.g. 'Did the sensor trigger when wire broke? [Yes/No]').\n"
                    md_content += "- **Frequency:** Enforced before the start of each shift or after a changeover.\n"
                elif "chemical" in f.lower() or "concentration" in f.lower():
                    md_content += "- **Form Layout:** Log entry for bath temperatures and chemical ratios with visual charts showing drift over 24 hours.\n"
                else:
                    md_content += "- **Form Layout:** Standardized table grid with pre-filled targets, allowing quick-confirm ticks.\n"
                    
                md_content += "\n"
                
        except Exception as e:
            md_content += f"❌ *Error reading this file: {e}*\n\n"
            
        md_content += "---\n\n"
        
    # Append schema proposal
    md_content += """
## 3. Database Schema for Dynamic Templating

To support all 14 checklists in a single application without hardcoding each one, we will use a **Dynamic Parameter Model**. This schema runs on PostgreSQL and allows admins to create new checklists and checklist items directly from the web interface.

```sql
-- 1. Checklist Templates (Metadata of the sheets)
CREATE TABLE checklist_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL, -- e.g., 'Fire Safety Check Sheet'
    doc_no VARCHAR(100),                 -- e.g., 'FRM/PR-EXT/01'
    rev_no VARCHAR(50) DEFAULT '00',     -- e.g., '01'
    rev_date DATE,
    frequency VARCHAR(50),               -- 'daily', 'weekly', 'shift-wise', 'hourly'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Template Categories / Sections (e.g. '60MM Extruder', 'UHF Oven')
CREATE TABLE template_sections (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES checklist_templates(id) ON DELETE CASCADE,
    section_name VARCHAR(255) NOT NULL,
    order_index INTEGER DEFAULT 0
);

-- 3. Template Items (The check points / parameters)
CREATE TABLE template_items (
    id SERIAL PRIMARY KEY,
    section_id INTEGER REFERENCES template_sections(id) ON DELETE CASCADE,
    check_point VARCHAR(255) NOT NULL,    -- e.g., 'Cylinder-1 Temp.'
    specification VARCHAR(255),           -- e.g., '60±5 ˚C'
    checking_method VARCHAR(255),         -- e.g., 'Visual', 'Vernier'
    responsibility VARCHAR(100) DEFAULT 'Operator',
    input_type VARCHAR(50) DEFAULT 'numeric', -- 'numeric', 'boolean' (OK/NG), 'text'
    expected_min NUMERIC,                 -- e.g. 55.0 (for automated validation)
    expected_max NUMERIC,                 -- e.g. 65.0
    is_mandatory BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0
);

-- 4. Checklist Submissions (Header record for a run)
CREATE TABLE checklist_submissions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES checklist_templates(id),
    machine_id INTEGER REFERENCES machines(id),
    user_id INTEGER REFERENCES users(id),
    shift VARCHAR(10) NOT NULL,           -- 'A', 'B', 'C'
    part_name VARCHAR(255),               -- e.g., 'YL1 Opening Trim'
    line_speed VARCHAR(50),
    checked_by INTEGER REFERENCES users(id), -- Incharge Signature
    checked_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id), -- Shift Manager Signature
    approved_at TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Submission Values (The actual parameters logged by the operator)
CREATE TABLE checklist_submission_values (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES checklist_submissions(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES template_items(id),
    actual_value VARCHAR(255),            -- e.g., '58' or 'OK'
    is_ok BOOLEAN DEFAULT TRUE,            -- Automatically calculated based on expected_min/max
    remarks TEXT
);
```

---

## 4. UI Implementation Plan

### A. Template Creator (Admin Dashboard)
A drag-and-drop template builder where the admin can:
1. Define sheet headers (Company Logo, Doc No, Rev No, Part Name).
2. Create sections (stations/processes).
3. Add check points, defining check specifications, checking methods, and validation bounds.

### B. Mobile Data Entry (Operator View)
1. **QR Scan:** Operator scans the QR code on a machine (e.g. Extrusion Line DD-1).
2. **Template Match:** The app detects that this line is currently running `Part YL1 Opening Trim` and loads template `FRM/PR-EXT/01`.
3. **Step-by-step Entry:** Collapsible sections guide the operator through:
   - Extruder parameters (numeric keyboard opens for temperatures/pressures).
   - Oven settings.
   - Slitting dimensions.
4. **Instant Validation:** If any values are out of spec, a red warning highlights immediately, requiring a validation note or photo.

### C. Incharge Approvals (Web/Tab Dashboard)
1. **Verification Queue:** Supervisors can view completed submissions grouped by shift.
2. **One-click Review:** Review "NG" values and comments.
3. **Digital Sign-off:** Signatures are logged with a username and timestamp, replacing the paper "Prepared By / Checked By / Approved By" block.
"""

    with open(dest_file, "w", encoding="utf-8") as out:
        out.write(md_content)
        
    print("Report generated successfully.")

if __name__ == "__main__":
    analyze_checklists()
