# Elektrisk Skipsfart

Analyse av maritim energibehov, utslipp og nettkapasitet i Norge.

## Prosjektstruktur

```
elektrisk-skipsfart/
├── dashboard/                 # React dashboard (Vite + Tailwind)
│   ├── src/App.jsx           # Hovedkomponent
│   └── public/maru_data.json # Aggregert data for dashboard
├── data/
│   ├── grid/                 # Nettkapasitetsdata (29 nettselskaper)
│   ├── maru/                 # MarU-data
│   │   ├── *.xlsx           # Rådata (ikke i repo, for store)
│   │   └── maru_dashboard_data.json
│   └── grid_index.json
├── external/
│   ├── kystverket-maru/      # Klone av Kystverkets MarU-modell
│   └── klimatiltak-2025/     # Referanse for styling
├── parse_maru_excel.py       # Script for å prosessere Excel → JSON
└── analyze_grid_data.py      # Script for å analysere nettdata
```

## Dashboard

Minimalistisk tabell-basert dashboard for MarU-data.

### Tilgjengelige filtre
- **År**: 2016–2025
- **Metrikk**: Energibehov, Landstrøm, CO₂, NOx, SOx, PM10, m.m.
- **Trafikktype**: Innenlands, fra/til utlandet, ved kai, osv.
- **Fase**: Seilas, manøvrering, ankring, ved kai, osv.
- **Fylke**: Alle norske fylker

### Kjør lokalt

```bash
cd dashboard
npm install
npm run dev
```

Åpne http://localhost:5173

## Datakilder

### MarU (Maritime Emissions)
- **Kilde**: [Kystverket MarU](https://github.com/Kystverket/maru)
- **Metode**: AIS-basert utslippsestimering (IMO Fourth GHG Study)
- **Data**: 4+ millioner datapunkter, 2016–2025
- **Aggregert**: 67,077 kombinasjoner (år × skipstype × størrelse × fase × trafikktype × fylke)

### Nettkapasitet
- **Kilde**: WattApp / Elhub
- **Data**: 734 lokasjoner, 29 nettselskaper
- **Innhold**: Tilgjengelig kapasitet for forbruk og produksjon (MW)

## Manglende data

Følgende er tilgjengelig i Kystverkets Power BI, men **ikke i Excel-eksporten**:
- **Flagg** (skipets registreringsland)
- Måned (kan legges til)
- Kommune (kan legges til)

For å få flagg-data må Kystverket kontaktes.

## Neste steg

1. ✅ Prosessere MarU Excel-data
2. ✅ Lage dashboard med fungerende filtre
3. ⬜ Kontakte Kystverket for flagg-data
4. ⬜ Koble sammen nettkapasitet og maritim data
5. ⬜ Identifisere havner med tilstrekkelig nettkapasitet for landstrøm

## Lisens

- Data: CC BY-NC-SA 4.0 (WattApp), Offentlig (Kystverket)
- Kode: MIT
