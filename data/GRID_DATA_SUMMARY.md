# Norwegian Grid Data Summary

## Overview

This directory contains electrical grid capacity data for 29 Norwegian grid operators, totaling 734 locations across Norway.

## Data Quality

- **Total Files**: 29
- **Valid JSON Files**: 29/29 (100%)
- **Total Locations**: 734
- **Geometry Types**:
  - Point geometries: Most locations (representing specific substations/points)
  - Polygon geometries: Some locations (representing service areas)

## Grid Operators by Location Count

| Rank | Operator | Locations | Coverage |
|------|----------|-----------|----------|
| 1 | ELVIA | 241 | Largest operator |
| 2 | TENSIO-TS | 57 | Northern Norway |
| 3 | ARVA | 56 | Northern Norway |
| 4 | BKK | 54 | Western Norway (Bergen area) |
| 5 | LEDE | 54 | Eastern Norway |
| 6 | Lnett | 47 | Western Norway |
| 7 | GlitreNettOst | 46 | Eastern Norway |
| 8 | FAGNE | 43 | Central Norway |
| 9 | Linja | 40 | Various regions |
| 10 | Barentsnett | 14 | Northern Norway (Barents Sea region) |
| 11 | Mellom | 12 | Central Norway |
| 12 | Statnett | 10 | National transmission grid |
| 13 | Havnett | 9 | Coastal areas |
| 14 | Elinett | 8 | Northern Norway |
| 15 | Fjellnett | 8 | Mountain regions |
| 16 | Lysna | 7 | Western Norway |
| 17 | Vevig | 7 | Western Norway |
| 18 | Vestall | 5 | Western Norway |
| 19 | Everket Notodden | 4 | Telemark region |
| 20 | Føre | 4 | Western Norway |
| 21 | Midtnett | 3 | Central Norway |
| 22 | Stannum | 3 | Western Norway |
| 23 | Romsdalsnett | 2 | Møre og Romsdal |
| 24-29 | Others | 0 | Empty files (no locations) |

## Geographic Distribution

The data covers all of Norway:
- **Northern Norway**: ARVA, Barentsnett, Elinett, TENSIO-TS
- **Western Norway**: BKK, Lnett, Havnett, Lysna, Vevig, Vestall, Føre, Stannum
- **Eastern Norway**: ELVIA, LEDE, GlitreNettOst
- **Central Norway**: FAGNE, Mellom, Midtnett, Romsdalsnett
- **National**: Statnett (transmission grid)

## Data Characteristics

### Capacity Information

Each location includes:
- **Available Consumption** (`availableCons`): Capacity available for consumption (MW)
- **Available Production** (`availableProd`): Capacity available for production (MW, negative values)
- **Reserved Consumption** (`reservedCons`): Reserved capacity (MW)

### Geometry Types

- **Point**: Exact location of substations/connection points
- **Polygon**: Service areas or regions (found in Statnett, Havnett, and some regional operators)

## Notes

1. Some operators have empty feature arrays (0 locations) - these files are kept for completeness
2. Polygon geometries represent service areas rather than specific connection points
3. All data follows CIM (Common Information Model) standards
4. Data is sourced from WattApp and updated regularly
5. Coordinates are in WGS84 (EPSG:4326)

## Integration Readiness

The data is ready for integration with:
- Shipping/port data from Kystverket
- Geographic analysis tools (GIS)
- Capacity planning systems
- Shore power feasibility studies

## Next Steps

1. ✅ Grid data organized and indexed
2. ⏳ Add Kystverket shipping data
3. ⏳ Create spatial analysis tools
4. ⏳ Build integration layer for combined analysis

