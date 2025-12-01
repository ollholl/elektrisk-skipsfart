# Elektrisk Skipsfart

Analyse av maritim energibehov og nettkapasitet i Norge.

## Prosjektstruktur

```
.
├── dashboard/              # React dashboard for MarU-data
│   ├── src/App.jsx        # Hovedkomponent
│   └── public/            # Statiske filer inkl. data
├── data/
│   ├── grid/              # Nettkapasitetsdata (29 nettselskaper)
│   ├── maru/              # MarU rådata og aggregert JSON
│   └── grid_index.json    # Indeks over nettdata
├── external/
│   ├── kystverket-maru/   # Klone av Kystverkets MarU-modell
│   └── klimatiltak-2025/  # Referanse for styling
└── parse_maru_excel.py    # Script for å prosessere Excel-data
```

## Dashboard

Minimalistisk dashboard basert på Edward Tufte-prinsipper:
- Høy data-ink ratio
- Tabell som primær datavisning
- Enkle, støttende grafer
- Fungerende filtre

### Kjør lokalt

```bash
cd dashboard
npm install
npm run dev
```

Åpne http://localhost:5173

## Datakilder

### MarU (Maritime Utslipp)
- **Kilde**: [Kystverket MarU](https://github.com/Kystverket/maru)
- **Data**: 4+ millioner datapunkter, 2016–2025
- **Innhold**: Energibehov, landstrøm, CO₂-utslipp per skipstype, størrelse, fase

### Nettkapasitet
- **Kilde**: WattApp / Elhub
- **Data**: 734 lokasjoner, 29 nettselskaper
- **Innhold**: Tilgjengelig kapasitet for forbruk og produksjon (MW)

## Neste steg

1. ~~Prosessere MarU Excel-data~~ ✓
2. ~~Lage dashboard med fungerende filtre~~ ✓
3. Koble sammen nettkapasitet og maritim data
4. Identifisere havner med tilstrekkelig nettkapasitet for landstrøm

## Lisens

Data: CC BY-NC-SA 4.0 (WattApp), Offentlig (Kystverket)
