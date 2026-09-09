import requests
import re
import urllib.parse

def search_indiamart(query):
    try:
        url = f'https://dir.indiamart.com/search.mp?ss={urllib.parse.quote(query)}'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        html = requests.get(url, headers=headers, timeout=10).text
        
        matches = re.findall(r'(https://5\.imimg\.com/data5/[^\"\?]+\.jpg)', html)
        if matches:
            for m in matches:
                if '500x500' in m or '1000x1000' in m:
                    return m
            return matches[0]
            
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

queries = ['EPS Insulated Panels', 'Aerogel Composite', 'Corrugated Galvanized Iron', 'PIR Foam Board']
for q in queries:
    print(f"{q}: {search_indiamart(q)}")
