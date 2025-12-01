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
3. ⬜ Kontakte Kystverket for flagg-data og havnedata
4. ⬜ Koble sammen nettkapasitet og maritim data
5. ⬜ Identifisere havner med tilstrekkelig nettkapasitet for landstrøm

---

## Visjon: Den Elektriske Kysten

**Mål:** Identifisere og prioritere havner for landstrømutbygging basert på energibehov og nettkapasitet.

### Konsept

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Skipsfart     │     │     Havner       │     │  Nettkapasitet  │
│   (MarU)        │────▶│   (koordinater)  │◀────│  (WattApp)      │
│                 │     │                  │     │                 │
│ • Energibehov   │     │ • Anløp per havn │     │ • Ledig MW      │
│ • Utslipp       │     │ • Liggetid       │     │ • Overskudd     │
│ • Ved kai-tid   │     │ • Skipsstørrelse │     │ • Avstand       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Elektrifiserings-   │
                    │     potensial        │
                    │                      │
                    │ • Egnethet per havn  │
                    │ • Prioriteringsliste │
                    │ • CO₂-reduksjon      │
                    └──────────────────────┘
```

### Fase 1: Skaffe havnedata

**Kilder:**
- [Kystverket Kystdatahuset](https://kystverket.no/sjotransport/kystdatahuset/) - Havneregister
- [SafeSeaNet Norway](https://www.kystverket.no/en/navigation-and-monitoring/safeseanet/) - Anløpsdata
- Kystverket direkte - MarU på havnenivå

**Nødvendig data:**
- Havnekoordinater (lat/lon)
- Energibehov per havn (fra MarU)
- Anløpsstatistikk (antall, liggetid, skipstyper)

### Fase 2: Koble havner til nettstasjoner

```python
for havn in havner:
    nærmeste = finn_nærmeste_stasjon(havn.koordinater, nettstasjoner)
    havn.ledig_kapasitet = nærmeste.availableCons
    havn.overskudd = nærmeste.availableProd
    havn.avstand_km = beregn_avstand(havn, nærmeste)
```

**Algoritme:**
1. Beregn haversine-avstand fra havn til alle nettstasjoner
2. Finn nærmeste stasjon(er) innenfor rimelig avstand (f.eks. 10 km)
3. Vurder total kapasitet tilgjengelig for havnen

### Fase 3: Estimere elektrifiseringspotensial

**Formel:**
```
Potensial (GWh) = Energibehov (ved kai) × Teknisk dekning × Kapasitetsfaktor

der:
  Teknisk dekning = andel skip som kan koble til landstrøm
  Kapasitetsfaktor = tilgjengelig nettkapasitet / estimert behov
```

**Prioriteringskriterier:**
| Kriterium | Vekt | Beskrivelse |
|-----------|------|-------------|
| Energibehov | 40% | GWh ved kai per år |
| Nettkapasitet | 30% | Ledig MW + overskudd |
| CO₂-potensial | 20% | Tonn CO₂ som kan unngås |
| Kostnadseffektivitet | 10% | Avstand til nettstasjon |

### Forventet resultat

**Eksempel på prioriteringsliste:**

| Rang | Havn | Energibehov | Ledig MW | Avstand | Egnethet |
|------|------|-------------|----------|---------|----------|
| 1 | Bergen | 45 GWh | 32,5 | 0,8 km | ⭐⭐⭐⭐⭐ |
| 2 | Stavanger | 38 GWh | 28,0 | 1,2 km | ⭐⭐⭐⭐⭐ |
| 3 | Ålesund | 22 GWh | 15,0 | 2,1 km | ⭐⭐⭐⭐ |
| ... | ... | ... | ... | ... | ... |

### Dataforespørsel til Kystverket

For å realisere visjonen trenger vi:

1. **Havnekoordinater** - Eksport fra Kystdatahuset
2. **MarU på havnenivå** - Aggregering per havn/kai i stedet for kommune
3. **Anløpsstatistikk** - Fra SafeSeaNet, helst med:
   - Antall anløp per havn per år
   - Gjennomsnittlig liggetid
   - Skipstyper og størrelser

**Kontakt:** [post@kystverket.no](mailto:post@kystverket.no)

---

## Lisens

- Data: CC BY-NC-SA 4.0 (WattApp), Offentlig (Kystverket)
- Kode: MIT
