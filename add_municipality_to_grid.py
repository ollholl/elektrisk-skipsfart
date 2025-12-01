#!/usr/bin/env python3
"""
Add municipality names to ALL grid locations using Kartverket's API.
Processes all individual grid JSON files.
"""
import json
import time
from pathlib import Path
import urllib.request

def get_municipality(lon, lat):
    """Get municipality name from coordinates using Kartverket API."""
    try:
        url = f"https://api.kartverket.no/kommuneinfo/v1/punkt?nord={lat}&ost={lon}&koordsys=4326"
        req = urllib.request.Request(url, headers={'User-Agent': 'ElektriskSkipsfart/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return {
                'kommune_nr': data.get('kommunenummer'),
                'kommune': data.get('kommunenavn'),
                'fylke_nr': data.get('fylkesnummer'),
                'fylke': data.get('fylkesnavn'),
            }
    except Exception as e:
        return None

def process_grid_file(filepath):
    """Process a single grid JSON file and add municipality data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Handle array format (some files have [{ features: [...] }])
    if isinstance(data, list):
        data = data[0]
    
    features = data.get('features', [])
    updated = 0
    
    for feature in features:
        geom = feature.get('geometry', {})
        coords = geom.get('coordinates', [])
        props = feature.get('properties', {})
        
        # Skip if already has municipality
        if props.get('kommune'):
            updated += 1
            continue
        
        if len(coords) >= 2:
            lon, lat = coords[0], coords[1]
            result = get_municipality(lon, lat)
            if result and result.get('kommune'):
                props['kommune'] = result['kommune']
                props['kommune_nr'] = result['kommune_nr']
                props['fylke'] = result['fylke']
                props['fylke_nr'] = result['fylke_nr']
                updated += 1
                print(f"  {props.get('name', 'Unknown')}: {result['kommune']}, {result['fylke']}")
            time.sleep(0.05)  # Be nice to API
    
    # Save updated file
    with open(filepath, 'w', encoding='utf-8') as f:
        if isinstance(data, dict):
            json.dump([data] if filepath.name != 'grid_index.json' else data, f, ensure_ascii=False, indent=2)
    
    return len(features), updated

def rebuild_index():
    """Rebuild grid_index.json from individual files."""
    from datetime import datetime
    
    grid_dir = Path('data/grid')
    index = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'description': 'Index of Norwegian electrical grid capacity data with municipality info',
            'total_files': 0,
            'total_features': 0,
        },
        'grid_operators': {}
    }
    
    for filepath in sorted(grid_dir.glob('*.json')):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            data = data[0]
        
        features = data.get('features', [])
        publisher = data.get('dcterms:publisher', [{}])
        if isinstance(publisher, list) and len(publisher) > 0:
            publisher_name = publisher[0].get('dcterms:title', filepath.stem.upper())
        else:
            publisher_name = filepath.stem.upper()
        
        locations = []
        for feat in features:
            props = feat.get('properties', {})
            geom = feat.get('geometry', {})
            locations.append({
                'name': props.get('name', 'Unknown'),
                'coordinates': geom.get('coordinates', []),
                'available_consumption': props.get('availableCons', 0),
                'available_production': props.get('availableProd', 0),
                'reserved_consumption': props.get('reservedCons', 0),
                'kommune': props.get('kommune'),
                'fylke': props.get('fylke'),
            })
        
        index['grid_operators'][filepath.stem] = {
            'file': filepath.name,
            'feature_count': len(features),
            'publisher': publisher_name,
            'locations': locations,
        }
        index['metadata']['total_files'] += 1
        index['metadata']['total_features'] += len(features)
    
    # Save index
    with open('data/grid_index.json', 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    # Copy to dashboard
    with open('dashboard/public/grid_index.json', 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    return index['metadata']['total_features']

def main():
    grid_dir = Path('data/grid')
    json_files = list(grid_dir.glob('*.json'))
    
    print(f"Found {len(json_files)} grid files\n")
    
    total_features = 0
    total_updated = 0
    
    for filepath in sorted(json_files):
        print(f"Processing {filepath.name}...")
        features, updated = process_grid_file(filepath)
        total_features += features
        total_updated += updated
    
    print(f"\n--- Summary ---")
    print(f"Total features: {total_features}")
    print(f"Updated: {total_updated}")
    
    print("\nRebuilding grid_index.json...")
    count = rebuild_index()
    print(f"Index rebuilt with {count} locations")
    print("Done!")

if __name__ == "__main__":
    main()
