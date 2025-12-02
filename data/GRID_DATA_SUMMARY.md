# Norwegian Grid Data

29 grid operators, 734 locations across Norway.

## Operators by Size

| Operator | Locations | Region |
|----------|-----------|--------|
| ELVIA | 241 | Eastern |
| TENSIO-TS | 57 | Northern |
| ARVA | 56 | Northern |
| BKK | 54 | Western (Bergen) |
| LEDE | 54 | Eastern |
| Lnett | 47 | Western |
| GlitreNettOst | 46 | Eastern |
| FAGNE | 43 | Central |
| Linja | 40 | Various |
| Barentsnett | 14 | Northern |
| Mellom | 12 | Central |
| Statnett | 10 | National (transmission) |
| Havnett | 9 | Coastal |
| Others | <10 each | Various |

## Data Fields

- `availableCons`: Available capacity for consumption (MW)
- `availableProd`: Available capacity for production (MW)
- `reservedCons`: Reserved capacity (MW)
- `kommune`, `fylke`: Municipality and county (added via Kartverket API)

## Format

- GeoJSON with Point or Polygon geometries
- Coordinates: WGS84 (EPSG:4326)
- Source: [WattApp](https://www.wattapp.no/)
