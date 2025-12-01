#!/usr/bin/env python3
"""
Script to parse MarU Excel files and convert to JSON for the dashboard.
"""
import json
import os
from pathlib import Path
from datetime import datetime

try:
    import pandas as pd
except ImportError:
    print("Installing pandas and openpyxl...")
    os.system("pip install pandas openpyxl")
    import pandas as pd

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

def create_dashboard_data(df):
    """Create aggregated data structures for the dashboard."""
    
    # Get unique values for filters
    years = sorted(df['year'].unique().tolist())
    months = sorted(df['year_month'].unique().tolist())
    vessel_types = sorted(df['vessel_type'].dropna().unique().tolist())
    gt_groups = sorted(df['gt_group'].dropna().unique().tolist())
    phases = sorted(df['phase'].dropna().unique().tolist())
    voyage_types = sorted(df['voyage_type'].dropna().unique().tolist())
    counties = sorted(df['county_name'].dropna().unique().tolist())
    municipalities = sorted(df['municipality_name'].dropna().unique().tolist())
    
    # Aggregate by year, vessel_type, gt_group
    agg_by_type_size = df.groupby(['year', 'vessel_type', 'gt_group']).agg({
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
    }).reset_index()
    
    # Aggregate by year, vessel_type
    agg_by_type = df.groupby(['year', 'vessel_type']).agg({
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
    }).reset_index()
    
    # Aggregate by year, county
    agg_by_county = df.groupby(['year', 'county_name']).agg({
        'sum_kwh': 'sum',
        'sum_kwh_shore_power': 'sum',
        'sum_co2_tonnes': 'sum',
        'sum_nox_tonnes': 'sum',
    }).reset_index()
    
    # Aggregate by year, phase
    agg_by_phase = df.groupby(['year', 'phase']).agg({
        'sum_kwh': 'sum',
        'sum_kwh_shore_power': 'sum',
        'sum_co2_tonnes': 'sum',
    }).reset_index()
    
    # Aggregate by year, voyage_type
    agg_by_voyage = df.groupby(['year', 'voyage_type']).agg({
        'sum_kwh': 'sum',
        'sum_co2_tonnes': 'sum',
    }).reset_index()
    
    # Year totals
    year_totals = df.groupby('year').agg({
        'sum_kwh': 'sum',
        'sum_kwh_shore_power': 'sum',
        'sum_kwh_battery': 'sum',
        'sum_fuel_mdo_equivalent_tonnes': 'sum',
        'sum_co2_tonnes': 'sum',
        'sum_co2e_tonnes': 'sum',
        'sum_nox_tonnes': 'sum',
        'sum_sox_tonnes': 'sum',
        'sum_pm10_tonnes': 'sum',
        'distance_kilometers': 'sum',
    }).reset_index()
    
    return {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'description': 'MarU Maritime Emissions Data - Aggregated for Dashboard',
            'source': 'Kystverket MarU Model',
            'years_covered': years,
            'total_records': len(df),
        },
        'filters': {
            'years': years,
            'months': months,
            'vessel_types': vessel_types,
            'gt_groups': gt_groups,
            'phases': phases,
            'voyage_types': voyage_types,
            'counties': counties,
            'municipalities': municipalities[:100],  # Limit for file size
        },
        'by_type_and_size': agg_by_type_size.to_dict(orient='records'),
        'by_type': agg_by_type.to_dict(orient='records'),
        'by_county': agg_by_county.to_dict(orient='records'),
        'by_phase': agg_by_phase.to_dict(orient='records'),
        'by_voyage_type': agg_by_voyage.to_dict(orient='records'),
        'year_totals': year_totals.to_dict(orient='records'),
    }

def main():
    """Main function to process MarU data."""
    print("Loading MarU Excel files...")
    df = load_all_years()
    
    print("\nColumn names:")
    print(list(df.columns))
    
    print("\nCreating dashboard data...")
    dashboard_data = create_dashboard_data(df)
    
    # Save to JSON
    output_path = Path("data/maru/maru_dashboard_data.json")
    print(f"\nSaving to {output_path}...")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(dashboard_data, f, indent=2, ensure_ascii=False, default=str)
    
    print(f"\nDone! Data saved to {output_path}")
    
    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Years: {dashboard_data['metadata']['years_covered']}")
    print(f"Vessel types: {len(dashboard_data['filters']['vessel_types'])}")
    print(f"GT groups: {dashboard_data['filters']['gt_groups']}")
    print(f"Counties: {len(dashboard_data['filters']['counties'])}")
    print(f"Phases: {dashboard_data['filters']['phases']}")
    print(f"Voyage types: {dashboard_data['filters']['voyage_types']}")
    
    print("\nYear totals (Energy MWh):")
    for row in dashboard_data['year_totals']:
        print(f"  {row['year']}: {row['sum_kwh']:,.0f} MWh (Shore power: {row['sum_kwh_shore_power']:,.0f} MWh)")

if __name__ == "__main__":
    main()
