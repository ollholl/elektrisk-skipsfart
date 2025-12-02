# Fra landstrøm til ladestrøm

Dashboard for skipsfart og nettkapasitet i Norge.

**Live:** [elektrisk-kyst.vercel.app](https://elektrisk-kyst.vercel.app)

## Hva er dette?

Et verktøy for å utforske:

1. **Skipsfart** — Energiforbruk og utslipp fra skip i norske farvann, fordelt på skipstype, størrelse, fase og fylke (data fra Kystverkets MarU-modell)

2. **Nettkapasitet** — Ledig tilknytningskapasitet i strømnettet, 855 områder fra 29 nettselskaper (data fra WattApp)

## Kjør lokalt

```bash
cd dashboard
npm install
npm run dev
```

## Datakilder

- **MarU**: [Kystverket](https://www.kystverket.no/klima-og-barekraft/maru/) — AIS-basert utslippsestimering
- **Nettkapasitet**: [WattApp](https://www.wattapp.no/) — Tilgjengelig kapasitet for nytt forbruk

## Visjon

Koble skipsfart til nettkapasitet på havnenivå for å identifisere hvor landstrøm og ladeinfrastruktur bør prioriteres — basert på energibehov, utslippspotensial og tilgjengelig nettkapasitet.

---

Data: CC BY-NC-SA 4.0 (WattApp), Offentlig (Kystverket) · Kode: MIT
