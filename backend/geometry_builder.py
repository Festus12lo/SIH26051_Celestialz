import os
import json
import math

class GeometryBuilder:
    def __init__(self, blueprint_data: dict, output_dir: str = "public/models"):
        self.data = blueprint_data
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        
    def generate_glb(self, filename="model.glb"):
        """Generates a highly accurate 3D GLB file from the blueprint JSON."""
        try:
            from build123d import Box, Location, Compound, export_gltf
        except ImportError:
            print("Error: build123d is not installed. Cannot generate 3D model.")
            return None

        geom = self.data.get("geometry", {})
        walls_data = geom.get("walls", [])
        doors_data = geom.get("doors", [])
        windows_data = geom.get("windows", [])
        
        building = self.data.get("building", {})
        ceiling_height = building.get("ceiling_height_m", 2.7) * 1000  # Convert to mm
        
        # Build walls
        wall_parts = []
        for wall in walls_data:
            start = wall["start"]
            end = wall["end"]
            thickness = wall["thickness"]
            
            # Calculate length and angle
            dx = end[0] - start[0]
            dy = end[1] - start[1]
            length = (dx**2 + dy**2)**0.5
            
            if length < 0.1:
                continue
                
            # Create a box for the wall
            wall_box = Box(length, thickness, ceiling_height)
            
            # Position it at the center of the segment
            mid_x = (start[0] + end[0]) / 2.0
            mid_y = (start[1] + end[1]) / 2.0
            
            # Rotate to match the line
            angle_rad = math.atan2(dy, dx)
            angle_deg = math.degrees(angle_rad)
            
            # Position and rotate the wall
            wall_part = wall_box.move(Location((mid_x, mid_y, ceiling_height/2), (0, 0, angle_deg)))
            
            wall_parts.append(wall_part)
            
        # We need to subtract doors and windows
        cutouts = []
        
        for door in doors_data:
            pos = door["pos"]
            width = door["width"]
            height = door["height"]
            rot = door["rot"]
            
            # Add extra thickness to ensure clean cuts
            door_box = Box(width, 1000, height) 
            cutout_part = door_box.move(Location((pos[0], pos[1], height/2), (0, 0, rot)))
            cutouts.append(cutout_part)
            
        for window in windows_data:
            pos = window["pos"]
            width = window["width"]
            height = window["height"]
            sill_height = window["sill_height"]
            
            wall_id = window["wall_id"]
            wall = next((w for w in walls_data if w["id"] == wall_id), None)
            if wall:
                dx = wall["end"][0] - wall["start"][0]
                dy = wall["end"][1] - wall["start"][1]
                angle_deg = math.degrees(math.atan2(dy, dx))
                
                win_box = Box(width, 1000, height)
                win_part = win_box.move(Location((pos[0], pos[1], sill_height + height/2), (0, 0, angle_deg)))
                cutouts.append(win_part)
                
        # Perform boolean subtraction
        final_walls = []
        if cutouts:
            cutout_compound = Compound(children=cutouts)
            for w in wall_parts:
                try:
                    final_w = w - cutout_compound
                    final_walls.append(final_w)
                except Exception as e:
                    print(f"Error subtracting from wall: {e}")
                    final_walls.append(w)
        else:
            final_walls = wall_parts
            
        # Floor
        length_m = building.get("length_m", 7.1)
        width_m = building.get("width_m", 7.1)
        
        floor_box = Box(length_m * 1000 + 600, width_m * 1000 + 600, 200)
        floor = floor_box.move(Location(((length_m*1000)/2, (width_m*1000)/2, -100)))
        
        # Roof (Simple flat roof)
        roof_box = Box(length_m * 1000 + 1200, width_m * 1000 + 1200, 200)
        roof = roof_box.move(Location(((length_m*1000)/2, (width_m*1000)/2, ceiling_height + 100)))
        
        # Furniture
        furniture_parts = []
        furniture_data = self.data.get("furniture", [])
        for f_room in furniture_data:
            for item in f_room.get("items", []):
                fw = item.get("width_m", 1) * 1000
                fd = item.get("depth_m", 1) * 1000
                fh = item.get("height_m", 1) * 1000
                fx = item.get("x", 0) * 1000
                fy = item.get("y", 0) * 1000
                frot = item.get("rotation_deg", 0)
                
                # We need absolute coordinates for furniture?
                # The sample JSON has furniture x/y as relative to room or absolute?
                # Let's assume absolute or we can find the room and add it.
                # In sample JSON: room x=1950, y=4150. Bed x=0.2925, y=0.885. This is relative.
                room_id = f_room.get("room_id")
                room = next((r for r in geom.get("rooms", []) if r["id"] == room_id), None)
                if room:
                    abs_x = room["x"] + fx
                    abs_y = room["y"] + fy
                else:
                    abs_x = fx
                    abs_y = fy
                    
                f_box = Box(fw, fd, fh)
                f_part = f_box.move(Location((abs_x + fw/2, abs_y + fd/2, fh/2), (0, 0, frot)))
                furniture_parts.append(f_part)
        
        # Combine everything
        assembly_parts = final_walls + [floor, roof] + furniture_parts
        final_assembly = Compound(children=assembly_parts)
        
        out_path = os.path.join(self.output_dir, filename)
        export_gltf(final_assembly, out_path, binary=True)
        
        return out_path

if __name__ == "__main__":
    import sys
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sample_json = os.path.join(base_dir, ".gemini", "antigravity-ide", "brain", "2dc340c1-0116-46dc-acc7-540d9e4be06e", "scratch", "sample_blueprint.json")
    
    if os.path.exists(sample_json):
        with open(sample_json, "r") as f:
            data = json.load(f)
            
        builder = GeometryBuilder(data, output_dir=os.path.join(base_dir, "public", "models"))
        out_file = builder.generate_glb("test_model.glb")
        print(f"Successfully generated {out_file}")
    else:
        print("sample_blueprint.json not found")
