#!/usr/bin/env python3
"""
Analyze grid data files and print summary statistics.
"""
import json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

def analyze():
    """Analyze grid files and return summary."""
    grid_dir = DATA / "grid"
    operators = {}
    total_features = 0

    for path in sorted(grid_dir.glob("*.json")):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list) and data:
            data = data[0]

        features = data.get("features", [])
        publisher = data.get("dcterms:publisher", [{}])
        name = publisher[0].get("dcterms:title", "Unknown") if isinstance(publisher, list) and publisher else "Unknown"

        operators[path.stem] = {
            "file": path.name,
            "publisher": name,
            "features": len(features),
        }
        total_features += len(features)

    return {
        "generated_at": datetime.now().isoformat(),
        "total_files": len(operators),
        "total_features": total_features,
        "operators": operators,
    }

def main():
    result = analyze()
    print(f"Grid Data Summary")
    print(f"Files: {result['total_files']}, Features: {result['total_features']}\n")
    for op, info in sorted(result["operators"].items(), key=lambda x: -x[1]["features"]):
        print(f"  {op}: {info['features']} ({info['publisher']})")

if __name__ == "__main__":
    main()
