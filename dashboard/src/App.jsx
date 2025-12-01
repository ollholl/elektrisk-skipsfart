import { useMemo, useState, useEffect } from "react";

// --- Helpers ---
function nb(n, d = 0) {
  if (n === undefined || n === null || isNaN(n)) return "–";
  return n.toLocaleString("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// Available measures
const MEASURES = {
  sum_kwh: { label: "Energibehov", unit: "GWh", divisor: 1_000_000 },
  sum_kwh_shore_power: { label: "Landstrøm", unit: "GWh", divisor: 1_000_000 },
  sum_kwh_battery: { label: "Batteri", unit: "GWh", divisor: 1_000_000 },
  sum_co2_tonnes: { label: "CO₂", unit: "kt", divisor: 1000 },
  sum_co2e_tonnes: { label: "CO₂-ekvivalenter", unit: "kt", divisor: 1000 },
  sum_nox_tonnes: { label: "NOx", unit: "tonn", divisor: 1 },
  sum_sox_tonnes: { label: "SOx", unit: "tonn", divisor: 1 },
  sum_pm10_tonnes: { label: "PM10", unit: "tonn", divisor: 1 },
  sum_fuel_mdo_equivalent_tonnes: { label: "Drivstoff (MDO-ekv.)", unit: "kt", divisor: 1000 },
  distance_kilometers: { label: "Distanse", unit: "km", divisor: 1 },
  sum_seconds: { label: "Tid", unit: "timer", divisor: 3600 },
};

// Labels
const GT_LABELS = {
  "gt1, 0-399": "0-399",
  "gt2, 400-999": "400-999",
  "gt3, 1000-2999": "1-3k",
  "gt4, 3000-4999": "3-5k",
  "gt5, 5000-9999": "5-10k",
  "gt6, 10000-24999": "10-25k",
  "gt7, 25000-49999": "25-50k",
  "gt8, 50000-99999": "50-100k",
  "gt9, >=100 000": "≥100k",
};
const GT_ORDER = Object.keys(GT_LABELS);

const VOYAGE_LABELS = {
  domestic: "Innenlands",
  international_in: "Fra utlandet",
  international_out: "Til utlandet",
  berthed: "Ved kai",
  ncs_facility_proximate: "Ved offshore",
  transit: "Gjennomfart",
};

const PHASE_LABELS = {
  "Node (berth)": "Ved kai",
  Cruise: "Seilas",
  Maneuver: "Manøvrering",
  Anchor: "Ankring",
  Fishing: "Fiske",
  Aquacultur: "Havbruk",
  "Dynamic positioning offshore": "DP offshore",
};

export default function MarUDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [year, setYear] = useState(2024);
  const [voyageType, setVoyageType] = useState("all");
  const [phase, setPhase] = useState("all");
  const [county, setCounty] = useState("all");
  const [measure, setMeasure] = useState("sum_kwh");

  useEffect(() => {
    fetch("/maru_data.json")
      .then((r) => (r.ok ? r.json() : Promise.reject("Kunne ikke laste data")))
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  // Filter options
  const filters = data?.filters || {};
  const years = filters.years || [];
  const voyageTypes = filters.voyage_types || [];
  const phases = filters.phases || [];
  const counties = filters.counties || [];

  const measureInfo = MEASURES[measure];

  // Filter and aggregate data
  const { tableData, sizeTotals, grandTotal } = useMemo(() => {
    if (!data?.data) return { tableData: [], sizeTotals: {}, grandTotal: 0 };

    // Apply filters
    let records = data.data.filter((d) => d.year === year);
    if (voyageType !== "all") records = records.filter((d) => d.voyage_type === voyageType);
    if (phase !== "all") records = records.filter((d) => d.phase === phase);
    if (county !== "all") records = records.filter((d) => d.county_name === county);

    // Aggregate by vessel_type × gt_group
    const byType = {};
    records.forEach((r) => {
      const type = r.vessel_type;
      const size = r.gt_group;
      const value = (r[measure] || 0) / measureInfo.divisor;

      if (!byType[type]) byType[type] = { type, sizes: {}, total: 0 };
      byType[type].sizes[size] = (byType[type].sizes[size] || 0) + value;
      byType[type].total += value;
    });

    const tableData = Object.values(byType).sort((a, b) => b.total - a.total);

    // Size totals
    const sizeTotals = {};
    GT_ORDER.forEach((g) => {
      sizeTotals[g] = tableData.reduce((s, r) => s + (r.sizes[g] || 0), 0);
    });

    const grandTotal = tableData.reduce((s, r) => s + r.total, 0);

    return { tableData, sizeTotals, grandTotal };
  }, [data, year, voyageType, phase, county, measure, measureInfo]);

  if (loading) return <div className="p-8 text-gray-500">Laster data...</div>;
  if (error) return <div className="p-8 text-red-600">Feil: {error}</div>;

  const activeFilters = [voyageType !== "all", phase !== "all", county !== "all"].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6 border-b border-gray-200 pb-4">
          <h1 className="text-xl font-medium text-gray-800">Skipsfart i Norge — Utslipp og energibehov</h1>
          <p className="text-sm text-gray-500 mt-1">Kilde: Kystverket MarU</p>
        </header>

        {/* Filters */}
        <section className="flex flex-wrap gap-3 mb-6 items-end text-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">År</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 bg-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Metrikk</label>
            <select
              value={measure}
              onChange={(e) => setMeasure(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 bg-white font-medium"
            >
              {Object.entries(MEASURES).map(([k, v]) => (
                <option key={k} value={k}>{v.label} ({v.unit})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Trafikktype</label>
            <select
              value={voyageType}
              onChange={(e) => setVoyageType(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="all">Alle</option>
              {voyageTypes.map((v) => (
                <option key={v} value={v}>{VOYAGE_LABELS[v] || v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Fase</label>
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="all">Alle</option>
              {phases.map((p) => (
                <option key={p} value={p}>{PHASE_LABELS[p] || p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Fylke</label>
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="all">Alle</option>
              {counties.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {activeFilters > 0 && (
            <button
              onClick={() => {
                setVoyageType("all");
                setPhase("all");
                setCounty("all");
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Nullstill
            </button>
          )}
        </section>

        {/* Summary */}
        <div className="mb-4 text-sm text-gray-600">
          <span className="font-medium text-gray-900 text-lg">{nb(grandTotal, 1)}</span>{" "}
          <span>{measureInfo.unit} {measureInfo.label.toLowerCase()}</span>
          {activeFilters > 0 && <span className="text-gray-400"> (filtrert)</span>}
        </div>

        {/* Table */}
        <section>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 pr-3 font-semibold text-gray-700">Skipstype</th>
                  {GT_ORDER.map((g) => (
                    <th key={g} className="text-right py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">
                      {GT_LABELS[g]}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-3 font-semibold text-gray-900">Sum</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={row.type} className={i % 2 ? "bg-gray-50" : ""}>
                    <td className="py-1.5 pr-3 text-gray-800">{row.type}</td>
                    {GT_ORDER.map((g) => (
                      <td key={g} className="py-1.5 px-1 text-right tabular-nums text-gray-600">
                        {row.sizes[g] ? nb(row.sizes[g], 1) : ""}
                      </td>
                    ))}
                    <td className="py-1.5 pl-3 text-right tabular-nums font-medium text-gray-900">
                      {nb(row.total, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-semibold">
                  <td className="py-2 pr-3 text-gray-900">Sum</td>
                  {GT_ORDER.map((g) => (
                    <td key={g} className="py-2 px-1 text-right tabular-nums text-gray-700">
                      {sizeTotals[g] ? nb(sizeTotals[g], 1) : ""}
                    </td>
                  ))}
                  <td className="py-2 pl-3 text-right tabular-nums text-gray-900">{nb(grandTotal, 1)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-xs text-gray-400 mt-8 pt-4 border-t border-gray-100">
          Data: Kystverket MarU ({years[0]}–{years[years.length - 1]}) •{" "}
          <a href="https://github.com/Kystverket/maru" className="underline">
            github.com/Kystverket/maru
          </a>
        </footer>
      </div>
    </div>
  );
}
