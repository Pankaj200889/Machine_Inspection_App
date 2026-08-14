import os
import psycopg2

def run():
    url = "postgresql://postgres:LfEANtORXNHsLmHJREoDKfONZmbNXPEj@tramway.proxy.rlwy.net:48989/railway"
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()
        cur.execute("SELECT id, username, email, role, password_hash FROM users")
        rows = cur.fetchall()
        for r in rows:
            print(f"ID: {r[0]}, Username: {r[1]}, Email: {r[2]}, Role: {r[3]}, Hash: {r[4]}")
        cur.close()
        conn.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    run()
