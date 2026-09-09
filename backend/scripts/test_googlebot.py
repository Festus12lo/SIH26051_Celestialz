import requests
import re
import urllib.parse
from html import unescape

def search_google_images(query):
    try:
        url = f'https://www.google.com/search?q={urllib.parse.quote(query)}&tbm=isch'
        headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        }
        html = requests.get(url, headers=headers, timeout=10).text
        
        matches = re.findall(r'<img[^>]+src=\"(https?://[^\"]+)\"', html, re.IGNORECASE)
        for m in matches:
            if 'gstatic.com' not in m and 'google.com' not in m and 'cleardot' not in m:
                return unescape(m)
        
        # If all are gstatic (thumbnails), return the first gstatic thumbnail
        if matches:
            return unescape(matches[1] if len(matches) > 1 else matches[0])
            
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

queries = ['EPS Insulated Panels product', 'Aerogel Composite product', 'Hollow Polymer construction', 'Low-E Double Glazed window']
for q in queries:
    print(f"{q}: {search_google_images(q)}")
