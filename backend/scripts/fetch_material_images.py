import sqlite3
import os
import requests
import time

DB_PATH = 'thermoshelter.db'
PUBLIC_DIR = os.path.join('..', 'public', 'materials')

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

# Map material names to known Wikipedia Commons filenames
WIKI_IMAGES = {
    'EPS Insulated Panels': 'Isokern_SIPS_2.0.jpg',
    'Aerogel Composite': 'Aerogel_hand.jpg',
    'Hollow Polymer': 'Polycarbonate_roofing.jpg',
    'Corrugated Galvanized Iron': 'MountLawleyRooftops_gobeirne.jpg',
    'Low-E Aluminum Sheet': 'Aluminio.jpg',
    'PIR Foam Board': 'Polyisocyanurate_foam.jpg',
    'Modular Hempcrete': 'Bloc_de_chanvre_ep_15cm.jpg', # Fallback to something if missing
    'High-Albedo Cool Roof': 'White_roof_painted.jpg',
    'Solar Absorbent Membrane': 'Solar_panels,_Santorini2.jpg',
    'Single Clear Glass': 'Glasscheibentransport-001.jpg',
    'Low-E Double Glazed': 'Insulated_glazing.jpg'
}

# Fallbacks for Wikipedia if the exact file doesn't exist
FALLBACK_URL = "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1000&auto=format&fit=crop"

def download_image(filename, save_path):
    headers = {'User-Agent': 'ThermoshelterBot/1.0'}
    
    # Try Wikipedia Special:FilePath
    url = f"https://en.wikipedia.org/wiki/Special:FilePath/{filename}"
    try:
        response = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        if response.status_code == 200 and 'html' not in response.headers.get('Content-Type', ''):
            with open(save_path, 'wb') as f:
                f.write(response.content)
            return True
    except Exception as e:
        print(f"Error downloading {filename}: {e}")
        
    # If it fails, just fetch a generic construction image from Unsplash as fallback
    print(f"  Fallback for {filename}")
    try:
        response = requests.get(FALLBACK_URL, headers=headers, timeout=10)
        with open(save_path, 'wb') as f:
            f.write(response.content)
        return True
    except:
        return False

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, name, category FROM materials')
    materials = cursor.fetchall()
    
    for mat_id, name, category in materials:
        print(f"Processing: {name} ({category})")
        
        cat_dir = os.path.join(PUBLIC_DIR, category)
        ensure_dir(cat_dir)
        
        local_path = os.path.join(cat_dir, f"{mat_id}.jpg")
        db_url_path = f"/materials/{category}/{mat_id}.jpg"
        
        wiki_file = WIKI_IMAGES.get(name, 'Construction_material.jpg')
        
        print(f"  Downloading image...")
        if download_image(wiki_file, local_path):
            print(f"  Successfully saved to {local_path}")
            cursor.execute('UPDATE materials SET image_url = ? WHERE id = ?', (db_url_path, mat_id))
            conn.commit()
        else:
            print("  Failed to download image.")
            
        time.sleep(1)

    conn.close()
    print("Done!")

if __name__ == '__main__':
    main()
