import os

def search_text(text):
    for root, dirs, files in os.walk('.'):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.git' in dirs:
            dirs.remove('.git')
        for file in files:
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if text in content:
                        print(f"Found in {path}")
            except Exception:
                pass

print("Searching for railway.app...")
search_text("railway.app")
print("\nSearching for siddhiss.com...")
search_text("siddhiss.com")
