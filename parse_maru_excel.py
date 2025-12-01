#!/usr/bin/env python3
"""
Parse MarU Excel files and create granular JSON for dashboard.
Aggregates at: year × vessel_type × gt_group × phase × voyage_type × county
"""
import json
import os
from pathlib import Path
from datetime import datetime

try:
    import pandas as pd  # type: ignore
except ImportError:
    os.system("pip install pandas openpyxl")
    import pandas as pd  # type: ignore

def load_all_years(maru_dir="data/maru"):
    """Load and combine all years of MarU data."""
    maru_dir = Path(maru_dir)
    excel_files = sorted(maru_dir.glob("*.xlsx"))
    
    all_data = []
    for file_path in excel_files:
        print(f"Loading {file_path.name}...")
        df = pd.read_excel(file_path, sheet_name='Sheet1')
        all_data.append(df)
    
    combined = pd.concat(all_data, ignore_index=True)
    print(f"\nTotal records: {len(combined):,}")
    return combined

def create_granular_data(df):
    """Create granular aggregated data for the dashboard."""
    
    # Define grouping dimensions
    dims = ['year', 'vessel_type', 'gt_group', 'phase', 'voyage_type', 'county_name']
    
    # Define measures to aggregate
    measures = {
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
    
    print("Creating granular aggregation...")
    
    # Main granular data: all dimensions
    granular = df.groupby(dims, dropna=False).agg(measures).reset_index()
    granular = granular.fillna({'county_name': 'Ukjent'})
    
    print(f"Granular records: {len(granular):,}")
    
    # Get unique values for filters
    years = sorted(df['year'].dropna().unique().tolist())
    vessel_types = sorted(df['vessel_type'].dropna().unique().tolist())
    gt_groups = sorted(df['gt_group'].dropna().unique().tolist())
    phases = sorted(df['phase'].dropna().unique().tolist())
    voyage_types = sorted(df['voyage_type'].dropna().unique().tolist())
    counties = sorted(df['county_name'].dropna().unique().tolist())
    
    # Year totals for quick reference
    year_totals = df.groupby('year').agg(measures).reset_index()
    
    return {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'description': 'MarU Maritime Emissions - Granular Data',
            'source': 'Kystverket MarU',
            'total_raw_records': len(df),
            'aggregated_records': len(granular),
        },
        'filters': {
            'years': years,
            'vessel_types': vessel_types,
            'gt_groups': gt_groups,
            'phases': phases,
            'voyage_types': voyage_types,
            'counties': counties,
        },
        'data': granular.to_dict(orient='records'),
        'year_totals': year_totals.to_dict(orient='records'),
    }

def main():
    print("Loading MarU Excel files...")
    df = load_all_years()
    
    print("\nCreating granular dashboard data...")
    dashboard_data = create_granular_data(df)
    
    output_path = Path("data/maru/maru_dashboard_data.json")
    print(f"\nSaving to {output_path}...")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(dashboard_data, f, ensure_ascii=False, indent=2, default=str)
    
    # Also copy to dashboard
    dashboard_public = Path("dashboard/public/maru_data.json")
    with open(dashboard_public, 'w', encoding='utf-8') as f:
        json.dump(dashboard_data, f, ensure_ascii=False, indent=2, default=str)
    
    file_size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"\nDone! File size: {file_size_mb:.1f} MB")
    print(f"Aggregated records: {dashboard_data['metadata']['aggregated_records']:,}")

if __name__ == "__main__":
    main()
