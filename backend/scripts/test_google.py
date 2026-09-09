import requests
import re
import urllib.parse
from html import unescape

def search_google_images(query):
    try:
        url = f'https://www.google.com/search?q={urllib.parse.quote(query)}&tbm=isch'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        html = requests.get(url, headers=headers, timeout=10).text
        
        # Google images puts URLs in a specific data structure or just in img tags.
        # It's easier to find URLs ending in .jpg in the source
        # Usually inside a JSON array
        matches = re.findall(r'\"(https?://[^\"]+\.jpe?g)\"', html, re.IGNORECASE)
        
        valid_images = []
        for m in matches:
            # Filter out tracking pixels or google icons
            if 'gstatic.com' not in m and 'google.com' not in m:
                valid_images.append(unescape(m))
                
        if valid_images:
            return valid_images[0]
            
        # fallback
        matches_img = re.findall(r'<img[^>]+src=\"(https?://[^\"]+)\"', html, re.IGNORECASE)
        if matches_img:
            return unescape(matches_img[0])
            
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

queries = ['EPS Insulated Panels product IndiaMart', 'Aerogel Composite product', 'Corrugated Galvanized Iron product']
for q in queries:
    print(f"{q}: {search_google_images(q)}")
