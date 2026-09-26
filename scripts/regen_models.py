import os
import json
from backend.geometry_builder import GeometryBuilder

sample_json = r"C:\Users\Dead Eye\.gemini\antigravity-ide\brain\2dc340c1-0116-46dc-acc7-540d9e4be06e\scratch\sample_blueprint.json"
out_dir = r"c:\Users\Dead Eye\Documents\Hackathon\public\models"

with open(sample_json, "r") as f:
    data = json.load(f)

print("Generating Emergency Shelter...")
data["building"]["width_m"] = 4.0
data["building"]["length_m"] = 3.0
b1 = GeometryBuilder(data, output_dir=out_dir)
b1.generate_glb("emergency_shelter.glb")

print("Generating Permanent Shelter...")
data["building"]["width_m"] = 7.1
data["building"]["length_m"] = 7.1
b2 = GeometryBuilder(data, output_dir=out_dir)
b2.generate_glb("permanent_shelter.glb")

print("Generating Community Shelter...")
data["building"]["width_m"] = 12.0
data["building"]["length_m"] = 8.0
b3 = GeometryBuilder(data, output_dir=out_dir)
b3.generate_glb("community_shelter.glb")

print("Done.")
