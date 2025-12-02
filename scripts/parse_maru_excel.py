#!/usr/bin/env python3
"""
Parse MarU Excel files and create aggregated JSON for dashboard.
Aggregates by: year × vessel_type × gt_group × phase × voyage_type × county
"""
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

try:
    import pandas as pd
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas", "openpyxl"])
    import pandas as pd

DIMS = ['year', 'vessel_type', 'gt_group', 'phase', 'voyage_type', 'county_name']
MEASURES = {
    'sum_kwh': 'sum',
    'sum_kwh_shore_power': 'sum',
    'sum_kwh_battery': 'sum',
    'sum_fuel_mdo_equivalent_tonnes': 'sum',
    'sum_co2_tonnes': 'sum',
    'sum_co2e_tonnes': 'sum',
    'sum_nox_tonnes': 'sum',
    'sum_sox_tonnes': 'sum',
    'sum_pm10_tonnes': 'sum',
    'sum_seconds': 'sum',
    'distance_kilometers': 'sum',
}

def load_all_years(maru_dir=None):
    """Load and combine all years of MarU Excel data."""
    maru_dir = Path(maru_dir) if maru_dir else DATA / "maru"
    all_data = []
    for path in sorted(maru_dir.glob("*.xlsx")):
        print(f"Loading {path.name}...")
        all_data.append(pd.read_excel(path, sheet_name='Sheet1'))
    combined = pd.concat(all_data, ignore_index=True)
    print(f"\nTotal records: {len(combined):,}")
    return combined

def aggregate(df):
    """Aggregate raw data by dimensions."""
    print("Aggregating...")
    granular = df.groupby(DIMS, dropna=False).agg(MEASURES).reset_index()
    granular = granular.fillna({'county_name': 'Ukjent'})
    print(f"Aggregated records: {len(granular):,}")

    def unique_sorted(col):
        return sorted(df[col].dropna().unique().tolist())

    return {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'source': 'Kystverket MarU',
            'raw_records': len(df),
            'aggregated_records': len(granular),
        },
        'filters': {
            'years': unique_sorted('year'),
            'vessel_types': unique_sorted('vessel_type'),
            'gt_groups': unique_sorted('gt_group'),
            'phases': unique_sorted('phase'),
            'voyage_types': unique_sorted('voyage_type'),
            'counties': unique_sorted('county_name'),
        },
        'data': granular.to_dict(orient='records'),
    }

def main():
    print("Loading MarU Excel files...")
    df = load_all_years()
    result = aggregate(df)

    output = DATA / "maru_data.json"
    print(f"\nSaving to {output}...")
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2, default=str)

    mb = output.stat().st_size / (1024 * 1024)
    print(f"Done! {mb:.1f} MB, {result['metadata']['aggregated_records']:,} records")

if __name__ == "__main__":
    main()
