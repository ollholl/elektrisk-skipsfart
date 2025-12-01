#!/usr/bin/env python3
"""
Script to validate Norwegian grid data JSON files.
"""
import json
import os
from pathlib import Path
from collections import defaultdict

def validate_json_file(file_path):
    """Validate a single JSON file."""
    errors = []
    warnings = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Check if it's a list or dict
        if isinstance(data, list):
            if len(data) == 0:
                errors.append("File is empty list")
                return errors, warnings
            collection = data[0]
        else:
            collection = data
        
        # Check for required top-level fields
        if "type" not in collection:
            errors.append("Missing 'type' field")
        elif collection.get("type") != "FeatureCollection":
            warnings.append(f"Type is '{collection.get('type')}', expected 'FeatureCollection'")
        
        # Check features
        features = collection.get("features", [])
        if not isinstance(features, list):
            errors.append("'features' is not a list")
        else:
            for i, feature in enumerate(features):
                # Check feature structure
                if not isinstance(feature, dict):
                    errors.append(f"Feature {i} is not an object")
                    continue
                
                if "type" not in feature:
                    errors.append(f"Feature {i} missing 'type'")
                elif feature.get("type") != "Feature":
                    warnings.append(f"Feature {i} type is '{feature.get('type')}', expected 'Feature'")
                
                # Check geometry
                geometry = feature.get("geometry", {})
                if not geometry:
                    errors.append(f"Feature {i} missing 'geometry'")
                else:
                    geom_type = geometry.get("type")
                    coords = geometry.get("coordinates", [])
                    
                    # Handle different geometry types
                    if geom_type == "Point":
                        if not coords or len(coords) != 2:
                            errors.append(f"Feature {i} Point has invalid coordinates")
                        else:
                            lon, lat = coords[0], coords[1]
                            if not (-180 <= lon <= 180):
                                errors.append(f"Feature {i} longitude {lon} out of range")
                            if not (-90 <= lat <= 90):
                                errors.append(f"Feature {i} latitude {lat} out of range")
                    elif geom_type in ["Polygon", "MultiPolygon"]:
                        # Polygon geometries are valid (representing areas)
                        # Extract centroid or first point for validation
                        if geom_type == "Polygon" and coords and len(coords) > 0:
                            # Polygon coordinates: [[[lon, lat], ...]]
                            if len(coords[0]) > 0 and len(coords[0][0]) >= 2:
                                lon, lat = coords[0][0][0], coords[0][0][1]
                                if not (-180 <= lon <= 180):
                                    warnings.append(f"Feature {i} Polygon longitude {lon} out of range")
                                if not (-90 <= lat <= 90):
                                    warnings.append(f"Feature {i} Polygon latitude {lat} out of range")
                        # MultiPolygon is more complex, just check it exists
                    else:
                        warnings.append(f"Feature {i} geometry type is '{geom_type}' (Point/Polygon expected)")
                
                # Check properties
                properties = feature.get("properties", {})
                if not properties:
                    warnings.append(f"Feature {i} missing 'properties'")
                else:
                    required_props = ["name", "owner"]
                    for prop in required_props:
                        if prop not in properties:
                            warnings.append(f"Feature {i} missing property '{prop}'")
        
        # Check metadata
        if "dcterms:publisher" not in collection:
            warnings.append("Missing publisher metadata")
        
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON: {e}")
    except Exception as e:
        errors.append(f"Error reading file: {e}")
    
    return errors, warnings

def main():
    """Main validation function."""
    grid_dir = Path("data/grid")
    
    if not grid_dir.exists():
        print(f"Error: Directory {grid_dir} does not exist")
        return
    
    grid_files = sorted(grid_dir.glob("*.json"))
    
    if not grid_files:
        print(f"No JSON files found in {grid_dir}")
        return
    
    print(f"Validating {len(grid_files)} grid data files...\n")
    
    total_errors = 0
    total_warnings = 0
    file_stats = {}
    
    for grid_file in grid_files:
        errors, warnings = validate_json_file(grid_file)
        
        file_stats[grid_file.name] = {
            "errors": len(errors),
            "warnings": len(warnings),
            "error_list": errors,
            "warning_list": warnings
        }
        
        total_errors += len(errors)
        total_warnings += len(warnings)
        
        if errors or warnings:
            print(f"📄 {grid_file.name}:")
            if errors:
                print(f"   ❌ {len(errors)} error(s)")
                for error in errors[:3]:  # Show first 3 errors
                    print(f"      - {error}")
                if len(errors) > 3:
                    print(f"      ... and {len(errors) - 3} more")
            if warnings:
                print(f"   ⚠️  {len(warnings)} warning(s)")
                for warning in warnings[:3]:  # Show first 3 warnings
                    print(f"      - {warning}")
                if len(warnings) > 3:
                    print(f"      ... and {len(warnings) - 3} more")
    
    print(f"\n{'='*60}")
    print(f"Validation Summary:")
    print(f"  Total files: {len(grid_files)}")
    print(f"  Files with errors: {sum(1 for s in file_stats.values() if s['errors'] > 0)}")
    print(f"  Files with warnings: {sum(1 for s in file_stats.values() if s['warnings'] > 0)}")
    print(f"  Total errors: {total_errors}")
    print(f"  Total warnings: {total_warnings}")
    
    if total_errors == 0 and total_warnings == 0:
        print(f"\n✅ All files validated successfully!")
    elif total_errors == 0:
        print(f"\n✅ All files are valid (some warnings present)")
    else:
        print(f"\n❌ Some files have errors that need to be fixed")

if __name__ == "__main__":
    main()

