#!/usr/bin/env python3
"""
Script to analyze and create an index of Norwegian grid data.
"""
import json
import os
from pathlib import Path
from collections import defaultdict
from datetime import datetime

def analyze_grid_files(data_dir="data/grid"):
    """Analyze all grid JSON files and create an index."""
    grid_files = Path(data_dir).glob("*.json")
    
    index = {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "description": "Index of Norwegian electrical grid capacity data",
            "total_files": 0,
            "total_features": 0
        },
        "grid_operators": {}
    }
    
    stats = defaultdict(lambda: {
        "file": None,
        "feature_count": 0,
        "publisher": None,
        "generated_at": None,
        "locations": []
    })
    
    for grid_file in sorted(grid_files):
        try:
            with open(grid_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            if isinstance(data, list) and len(data) > 0:
                collection = data[0]
            else:
                collection = data
                
            # Extract metadata
            publisher_info = collection.get("dcterms:publisher", [])
            if isinstance(publisher_info, list) and len(publisher_info) > 0:
                publisher = publisher_info[0].get("dcterms:title", "Unknown")
            else:
                publisher = "Unknown"
                
            generated_at = collection.get("prov:generatedAt", [])
            if isinstance(generated_at, list) and len(generated_at) > 0:
                gen_date = generated_at[0].get("@value", "Unknown")
            else:
                gen_date = "Unknown"
            
            # Count features
            features = collection.get("features", [])
            feature_count = len(features)
            
            # Extract location names
            locations = []
            for feature in features:
                props = feature.get("properties", {})
                name = props.get("name", "Unknown")
                coords = feature.get("geometry", {}).get("coordinates", [])
                if coords:
                    locations.append({
                        "name": name,
                        "coordinates": coords,
                        "available_consumption": props.get("availableCons"),
                        "available_production": props.get("availableProd"),
                        "reserved_consumption": props.get("reservedCons")
                    })
            
            # Use filename as key (without extension)
            operator_key = grid_file.stem
            
            stats[operator_key] = {
                "file": grid_file.name,
                "feature_count": feature_count,
                "publisher": publisher,
                "generated_at": gen_date,
                "locations": locations[:10]  # First 10 locations as sample
            }
            
            index["metadata"]["total_files"] += 1
            index["metadata"]["total_features"] += feature_count
            
        except Exception as e:
            print(f"Error processing {grid_file}: {e}")
            continue
    
    index["grid_operators"] = dict(stats)
    
    return index

def main():
    """Main function to analyze and save index."""
    print("Analyzing grid data files...")
    index = analyze_grid_files()
    
    # Save index
    output_file = "data/grid_index.json"
    os.makedirs("data", exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    
    print(f"\nAnalysis complete!")
    print(f"Total files: {index['metadata']['total_files']}")
    print(f"Total features: {index['metadata']['total_features']}")
    print(f"Index saved to: {output_file}")
    
    # Print summary
    print("\nGrid Operators:")
    for operator, data in sorted(index["grid_operators"].items()):
        print(f"  - {operator}: {data['feature_count']} locations ({data['publisher']})")

if __name__ == "__main__":
    main()

