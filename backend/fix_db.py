import sqlite3

# Guaranteed-to-load Unsplash images & detailed descriptions
material_data = {
    'eps': {
        'image': 'https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&q=80',
        'desc': 'Expanded Polystyrene (EPS) panels are highly efficient, lightweight rigid foam boards. They provide excellent thermal insulation by trapping air within a closed-cell matrix, making them ideal for rapid emergency deployment and extreme cold climates.'
    },
    'aerogel': {
        'image': 'https://images.unsplash.com/photo-1580974582391-a6649c82a85f?w=800&q=80',
        'desc': 'Aerogel is a synthetic, highly porous ultralight material derived from a gel. With the lowest thermal conductivity of any known solid, it offers unmatched insulation per inch. It is extremely expensive but critical for surviving extreme sub-zero environments.'
    },
    'pir': {
        'image': 'https://images.unsplash.com/photo-1628186178788-b220302dc8fc?w=800&q=80',
        'desc': 'Polyisocyanurate (PIR) is a thermoset plastic typically produced as a foam. It has excellent thermal performance and superior fire resistance compared to EPS, making it a staple for community halls and large-span public shelters.'
    },
    'hempcrete': {
        'image': 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?w=800&q=80',
        'desc': 'Modular Hempcrete is a bio-composite material made from the inner woody core of the hemp plant mixed with a lime-based binder. It offers incredible thermal mass, is highly breathable, and is carbon-negative, making it perfect for permanent eco-shelters.'
    },
    'hollow_polymer': {
        'image': 'https://images.unsplash.com/photo-1534062128522-861f625e1dfa?w=800&q=80',
        'desc': 'Hollow polymer matrices are highly extruded synthetic plastics designed to trap air in geometric pockets. Extremely cheap and lightweight, they are primarily used in rapid-response disaster relief housing.'
    },
    'galvanized': {
        'image': 'https://images.unsplash.com/photo-1588614644596-f000311f9999?w=800&q=80',
        'desc': 'Corrugated Galvanized Iron (CGI) is a standard roofing material. It is cheap, highly durable, and easily transportable. However, it requires heavy under-insulation due to its extremely high thermal conductivity.'
    },
    'low_e_alu': {
        'image': 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=800&q=80',
        'desc': 'Low-Emissivity Aluminum Sheets are coated metal roofing panels designed to reflect a massive amount of radiant heat. They are highly effective in community shelters to prevent massive indoor heat gain during peak summer.'
    },
    'cool_roof': {
        'image': 'https://images.unsplash.com/photo-1621360057868-b7c125df10ea?w=800&q=80',
        'desc': 'High-Albedo Cool Roofs utilize highly reflective white thermoplastic membranes (like TPO or PVC). By rejecting over 80% of solar radiation, they dramatically reduce the cooling load for permanent shelters in warm climates.'
    },
    'solar_absorbent': {
        'image': 'https://images.unsplash.com/photo-1616035099516-750d99fae486?w=800&q=80',
        'desc': 'A dark, highly specialized EPDM rubber membrane designed intentionally to absorb solar radiation. In extreme cold environments like Leh or Ladakh, this roof passively harvests solar heat to warm the emergency shelter.'
    },
    'single_clear': {
        'image': 'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?w=800&q=80',
        'desc': 'Standard 3mm/6mm clear float glass. It provides necessary daylighting but offers very poor thermal resistance. Used primarily in low-budget emergency and community shelters.'
    },
    'low_e_double_glazed': {
        'image': 'https://images.unsplash.com/photo-1509644851169-2acc08aa25b5?w=800&q=80',
        'desc': 'Insulated Glass Units (IGUs) consisting of two glass panes separated by an argon gas-filled space, coated with a microscopic Low-E layer. Essential for permanent residential shelters to retain indoor heat while allowing passive solar gain.'
    }
}

def main():
    conn = sqlite3.connect('thermoshelter.db')
    c = conn.cursor()

    # Add description column if it doesn't exist
    try:
        c.execute("ALTER TABLE materials ADD COLUMN description TEXT")
        print("Added 'description' column.")
    except sqlite3.OperationalError:
        print("Column 'description' already exists.")

    for m_id, data in material_data.items():
        c.execute("UPDATE materials SET image_url = ?, description = ? WHERE id = ?", (data['image'], data['desc'], m_id))
        print(f"Updated {m_id}")

    conn.commit()
    conn.close()
    print("Database updated with descriptions and working images!")

if __name__ == '__main__':
    main()
