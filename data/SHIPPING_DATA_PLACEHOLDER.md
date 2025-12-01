# Kystverket Shipping Data

This directory will contain shipping and port data from Kystverket.

## Expected Data Types

Based on the Kystverket MarU model, we may receive:

- **Port/Berth Locations**: Geographic coordinates of ports and berths
- **AIS Data**: Ship traffic patterns and routes
- **Vessel Information**: Ship types, sizes, and characteristics
- **Areas**: Geographic areas for maritime zones
- **Shore Power Status**: Information about existing shore power connections (phase "p" in MarU)

## Integration Goals

Once data is available, we will:

1. **Spatial Matching**: Match ports/berths with nearby grid capacity points
2. **Capacity Analysis**: Identify ports with sufficient grid capacity for shore power
3. **Feasibility Studies**: Analyze potential for new shore power installations
4. **Route Analysis**: Map shipping routes against grid infrastructure

## Data Structure

Data will be organized in a similar structure to grid data:
- GeoJSON format for geographic data
- Index file for quick lookup
- Validation scripts
- Analysis tools

## References

- [Kystverket MarU Repository](https://github.com/Kystverket/maru) - Maritime Emissions Model
- MarU phases include: "n" (node/berth) and "p" (using shore power)

