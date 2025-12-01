# Elektrisk Skipsfart - Norwegian Grid Data

This repository contains electrical grid capacity data for Norway, organized for analysis and integration with shipping (skipsfart) data from Kystverket.

## 📁 Directory Structure

```
.
├── data/
│   ├── grid/                    # Grid operator data files (GeoJSON)
│   │   ├── arva.json
│   │   ├── bkk.json
│   │   ├── elvia.json
│   │   └── ... (29 files total)
│   └── grid_index.json          # Index and summary of all grid data
├── external/                    # External cloned repositories (not committed)
│   └── kystverket-maru/         # Kystverket MarU emissions model
├── analyze_grid_data.py         # Script to analyze and index grid data
└── README.md                    # This file
```

## 📊 Data Overview

- **Total Grid Operators**: 29
- **Total Locations**: 734
- **Data Format**: GeoJSON FeatureCollection
- **Data Source**: WattApp (https://www.wattapp.no/)
- **License**: CC BY-NC-SA 4.0

## 🔌 Grid Operators

The following grid operators are included in the dataset:

| Operator | Locations | File |
|----------|-----------|------|
| ARVA | 56 | `arva.json` |
| Barentsnett | 14 | `barentsnett.json` |
| BKK | 54 | `bkk.json` |
| Bømlo | 0 | `bomlo.json` |
| Elinett | 8 | `elinett.json` |
| ELVIA | 241 | `elvia.json` |
| Everket Notodden | 4 | `everket_notodden.json` |
| FAGNE | 43 | `fagne.json` |
| Fjellnett | 8 | `fjellnett.json` |
| Føre | 4 | `fore.json` |
| GlitreNettOst | 46 | `glitrenettost.json` |
| Havnett | 9 | `havnett.json` |
| Jæren Everk | 0 | `jaeren.json` |
| LEDE | 54 | `lede.json` |
| Linea | 0 | `linea.json` |
| Linja | 40 | `linja.json` |
| Lnett | 47 | `lnett.json` |
| Lysna | 7 | `lysna.json` |
| Mellom | 12 | `mellom.json` |
| Midtnett | 3 | `midtnett.json` |
| Norgesnett | 0 | `norgesnett.json` |
| Rakkestad Energi | 0 | `rakkestad.json` |
| Romsdalsnett | 2 | `romsdalsnett.json` |
| Stannum | 3 | `stannum.json` |
| Statnett | 10 | `statnett.json` |
| TENSIO-TS | 57 | `tensio-ts.json` |
| Vang Energiverk | 0 | `vang.json` |
| Vestall | 5 | `vestall.json` |
| Vevig | 7 | `vevig.json` |

## 📋 Data Structure

Each JSON file contains a GeoJSON FeatureCollection with the following structure:

```json
{
  "features": [
    {
      "id": "unique-identifier",
      "type": "Feature",
      "geometry": {
        "type": "Point",  // or "Polygon" for service areas
        "coordinates": [longitude, latitude]  // or polygon coordinates for areas
      },
      "properties": {
        "name": "Location name",
        "owner": "Grid operator name",
        "description": "Full description",
        "shortDescription": "Short description",
        "capacityDate": "ISO 8601 date",
        "capacityUnit": "MW",
        "reservedCons": 0,
        "availableCons": 0,
        "availableProd": 0
      }
    }
  ],
  "type": "FeatureCollection",
  "dcterms:publisher": [{"dcterms:title": "Operator Name"}],
  "prov:generatedAt": [{"@value": "ISO 8601 date"}]
}
```

### Property Fields

- **name**: Name of the location/substation
- **owner**: Grid operator name
- **description**: Full description (Norwegian)
- **shortDescription**: Short description (Norwegian)
- **capacityDate**: Date when capacity data was generated
- **capacityUnit**: Unit for capacity values (typically "MW")
- **reservedCons**: Reserved consumption capacity (MW)
- **availableCons**: Available consumption capacity (MW)
- **availableProd**: Available production capacity (MW, negative values indicate production)

## 🔍 Using the Data

### View the Index

The `data/grid_index.json` file contains a summary of all grid data:

```python
import json

with open('data/grid_index.json', 'r') as f:
    index = json.load(f)

print(f"Total locations: {index['metadata']['total_features']}")
for operator, data in index['grid_operators'].items():
    print(f"{operator}: {data['feature_count']} locations")
```

### Load Grid Data

```python
import json

# Load a specific grid operator's data
with open('data/grid/bkk.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    
# Extract features
features = data[0]['features'] if isinstance(data, list) else data['features']

for feature in features:
    props = feature['properties']
    coords = feature['geometry']['coordinates']
    print(f"{props['name']}: {coords}")
```

### Analyze Grid Data

Run the analysis script to regenerate the index:

```bash
python analyze_grid_data.py
```

## 🚢 Kystverket Integration

This grid data will be integrated with shipping (skipsfart) data from Kystverket to enable analysis of:
- Electrical grid capacity near ports and shipping routes
- Potential for shore power connections
- Grid capacity for electric vessel charging

**Kystverket Data Source**: [Kystverket MarU](https://github.com/Kystverket/maru) - Maritime Emissions Model

### MarU Data Model

| Table | Description |
|-------|-------------|
| `vessel_port_electric` | Vessel-specific shore power usage by municipality |
| `vessel_type_port_electric` | Vessel type shore power usage by municipality |
| `shore_power` | Geographic locations of shore power installations (H3 hex grid) |

### MarU Phases
- **n**: Node/berth (vessel at port)
- **p**: Using shore power
- **close_to_power**: Vessel within range of shore power installation

### Clone MarU Repository
```bash
git clone https://github.com/Kystverket/maru.git external/kystverket-maru
```

## 📝 Notes

- Some grid operators have 0 locations in their files (empty feature arrays)
- Data is sourced from WattApp and follows CIM (Common Information Model) standards
- All coordinates are in WGS84 (EPSG:4326)
- Capacity values are in MW (Megawatts)
- Negative `availableProd` values indicate production capacity
- Most locations use Point geometries, but some use Polygon geometries to represent service areas (e.g., Statnett transmission grid areas)

## 📄 License

Data is licensed under CC BY-NC-SA 4.0 (Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International).

## 🔗 References

- [WattApp](https://www.wattapp.no/) - Source of grid capacity data
- [Statnett Områdeplaner](https://www.statnett.no/for-aktorer-i-kraftbransjen/planer-og-analyser/omradeplaner/) - Regional grid plans
- [ENTSO-E CIM](http://entsoe.eu/CIM/GeographicalLocation/3/0) - Common Information Model standard

