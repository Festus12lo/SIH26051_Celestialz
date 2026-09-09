import sqlite3
import json

conn = sqlite3.connect('thermoshelter.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Get schema
cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
schema = {row['name']: row['sql'] for row in tables}

# Get data
cursor.execute('SELECT * FROM materials')
data = [dict(row) for row in cursor.fetchall()]

print(json.dumps({'schema': schema, 'data': data}, indent=2))
