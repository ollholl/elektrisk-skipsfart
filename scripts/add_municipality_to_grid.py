#!/usr/bin/env python3
"""
Enrich grid locations with municipality names using Kartverket's API.
"""
import json
import time
from pathlib import Path
from datetime import datetime
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

def get_centroid(coords):
    """Calculate centroid of a polygon."""
    if not isinstance(coords, list) or not coords:
        return None, None
    # Unwrap nested arrays: [[[lon,lat], ...]] → [[lon,lat], ...]
    while isinstance(coords[0], list) and isinstance(coords[0][0], list):
        coords = coords[0]
    if isinstance(coords[0], list) and len(coords[0]) >= 2:
        lons = [p[0] for p in coords if isinstance(p, list) and len(p) >= 2]
        lats = [p[1] for p in coords if isinstance(p, list) and len(p) >= 2]
        if lons and lats:
            return sum(lons) / len(lons), sum(lats) / len(lats)
    return None, None

def get_municipality(lon, lat):
    """Look up municipality from coordinates via Kartverket API."""
    try:
        url = f"https://api.kartverket.no/kommuneinfo/v1/punkt?nord={lat}&ost={lon}&koordsys=4326"
        req = urllib.request.Request(url, headers={'User-Agent': 'ElektriskSkipsfart/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            d = json.loads(resp.read().decode())
            return {
                'kommune': d.get('kommunenavn'),
                'kommune_nr': d.get('kommunenummer'),
                'fylke': d.get('fylkesnavn'),
                'fylke_nr': d.get('fylkesnummer'),
            }
    except Exception:
        return None

def extract_coords(geom):
    """Extract lon, lat from geometry (Point or Polygon)."""
    coords = geom.get('coordinates', [])
    geom_type = geom.get('type', '')
    if geom_type == 'Point' and len(coords) >= 2:
        return coords[0], coords[1]
    if geom_type == 'Polygon' or (isinstance(coords, list) and coords and isinstance(coords[0], list)):
        return get_centroid(coords)
    if len(coords) >= 2 and isinstance(coords[0], (int, float)):
        return coords[0], coords[1]
    return None, None

def process_grid_file(filepath):
    """Add municipality data to a grid file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if isinstance(data, list):
        data = data[0]

    features = data.get('features', [])
    updated = 0

    for feat in features:
        props = feat.get('properties', {})
        if props.get('kommune'):
            updated += 1
            continue

        lon, lat = extract_coords(feat.get('geometry', {}))
        if lon is None:
            continue

        result = get_municipality(lon, lat)
        if result and result.get('kommune'):
            props.update(result)
            updated += 1
            print(f"  {props.get('name', '?')}: {result['kommune']}, {result['fylke']}")
        time.sleep(0.05)

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump([data] if filepath.name != 'grid_index.json' else data, f, ensure_ascii=False, indent=2)

    return len(features), updated

def rebuild_index():
    """Rebuild grid_index.json from individual operator files."""
    grid_dir = DATA / "grid"
    index = {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'total_files': 0,
            'total_features': 0,
        },
        'grid_operators': {}
    }

    for path in sorted(grid_dir.glob('*.json')):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list):
            data = data[0]

        features = data.get('features', [])
        publisher = data.get('dcterms:publisher', [{}])
        publisher_name = publisher[0].get('dcterms:title', path.stem.upper()) if isinstance(publisher, list) and publisher else path.stem.upper()

        locations = [{
            'name': f.get('properties', {}).get('name', 'Unknown'),
            'coordinates': f.get('geometry', {}).get('coordinates', []),
            'available_consumption': f.get('properties', {}).get('availableCons', 0),
            'available_production': f.get('properties', {}).get('availableProd', 0),
            'reserved_consumption': f.get('properties', {}).get('reservedCons', 0),
            'kommune': f.get('properties', {}).get('kommune'),
            'fylke': f.get('properties', {}).get('fylke'),
        } for f in features]

        index['grid_operators'][path.stem] = {
            'file': path.name,
            'feature_count': len(features),
            'publisher': publisher_name,
            'locations': locations,
        }
        index['metadata']['total_files'] += 1
        index['metadata']['total_features'] += len(features)

    with open(DATA / "grid_index.json", 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    return index['metadata']['total_features']

def main():
    grid_dir = DATA / "grid"
    files = list(grid_dir.glob('*.json'))
    print(f"Found {len(files)} grid files\n")

    total_features, total_updated = 0, 0
    for path in sorted(files):
        print(f"Processing {path.name}...")
        features, updated = process_grid_file(path)
        total_features += features
        total_updated += updated

    print(f"\nTotal: {total_features} features, {total_updated} with municipality data")
    print("\nRebuilding index...")
    count = rebuild_index()
    print(f"Index: {count} locations")

if __name__ == "__main__":
    main()
