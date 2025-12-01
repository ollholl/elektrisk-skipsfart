import { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

// --- Tufte-inspired minimal styling ---
// High data-ink ratio, no chartjunk, clear hierarchy

function nb(n, d = 0) {
  if (n === undefined || n === null || isNaN(n)) return "–";
  return n.toLocaleString("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function toGWh(kwh) {
  return (kwh || 0) / 1_000_000;
}

// Minimal tooltip
function MinimalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-300 px-2 py-1 text-xs shadow-sm">
      <span className="font-medium">{label}:</span> {nb(payload[0].value, 1)} GWh
    </div>
  );
}

// Size labels
const GT_LABELS = {
  "gt1, 0-399": "0-399",
  "gt2, 400-999": "400-999",
  "gt3, 1000-2999": "1000-2999",
  "gt4, 3000-4999": "3000-4999",
  "gt5, 5000-9999": "5000-9999",
  "gt6, 10000-24999": "10000-24999",
  "gt7, 25000-49999": "25000-49999",
  "gt8, 50000-99999": "50000-99999",
  "gt9, >=100 000": "≥100000",
};

const GT_ORDER = Object.keys(GT_LABELS);

// Voyage type labels (trafikktype)
const VOYAGE_LABELS = {
  "all": "Alle",
  "domestic": "Innenlands",
  "international_in": "Fra utlandet",
  "international_out": "Til utlandet",
  "berthed": "Ved kai",
  "ncs_facility_proximate": "Ved offshore",
  "transit": "Gjennomfart",
};

// Phase labels
const PHASE_LABELS = {
  "Node (berth)": "Ved kai",
  "Cruise": "Seilas",
  "Maneuver": "Manøvrering",
  "Anchor": "Ankring",
  "Fishing": "Fiske",
  "Aquacultur": "Havbruk",
  "Dynamic positioning offshore": "DP offshore",
};

export default function MarUDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters - single select
  const [year, setYear] = useState(2024);
  const [voyageType, setVoyageType] = useState("all");

  useEffect(() => {
    fetch("/maru_data.json")
      .then((r) => r.ok ? r.json() : Promise.reject("Kunne ikke laste data"))
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e); setLoading(false); });
  }, []);

  // Available years
  const years = data?.filters?.years || [];

  // Filter and aggregate data
  const filtered = useMemo(() => {
    if (!data) return { byType: [], bySize: [], byPhase: [], total: 0, shorePower: 0, co2: 0 };

    // Get data for selected year
    const yearByType = data.by_type?.filter((d) => d.year === year) || [];
    const yearByTypeSize = data.by_type_and_size?.filter((d) => d.year === year) || [];
    const yearByPhase = data.by_phase?.filter((d) => d.year === year) || [];
    const yearByVoyage = data.by_voyage_type?.filter((d) => d.year === year) || [];
    const yearTotals = data.year_totals?.find((d) => d.year === year);

    // If voyage type filter is applied, we need to show that we're filtering
    // Note: Current data structure doesn't have voyage breakdown per type/size
    // So we show the voyage-level totals when filtered
    
    let total, shorePower, co2;
    
    if (voyageType === "all") {
      total = yearTotals?.sum_kwh || 0;
      shorePower = yearTotals?.sum_kwh_shore_power || 0;
      co2 = yearTotals?.sum_co2_tonnes || 0;
    } else {
      const voyageData = yearByVoyage.find((d) => d.voyage_type === voyageType);
      total = voyageData?.sum_kwh || 0;
      shorePower = 0; // Not available at voyage level
      co2 = voyageData?.sum_co2_tonnes || 0;
    }

    // By type (sorted by energy)
    const byType = yearByType
      .map((d) => ({ name: d.vessel_type, gwh: toGWh(d.sum_kwh) }))
      .sort((a, b) => b.gwh - a.gwh);

    // By size
    const sizeAgg = {};
    yearByTypeSize.forEach((d) => {
      sizeAgg[d.gt_group] = (sizeAgg[d.gt_group] || 0) + d.sum_kwh;
    });
    const bySize = GT_ORDER
      .filter((g) => sizeAgg[g])
      .map((g) => ({ name: GT_LABELS[g], gwh: toGWh(sizeAgg[g]) }));

    // By phase
    const byPhase = yearByPhase
      .map((d) => ({ 
        name: PHASE_LABELS[d.phase] || d.phase, 
        gwh: toGWh(d.sum_kwh),
        shorePower: toGWh(d.sum_kwh_shore_power)
      }))
      .sort((a, b) => b.gwh - a.gwh);

    return { byType, bySize, byPhase, total, shorePower, co2 };
  }, [data, year, voyageType]);

  // Trend data
  const trend = useMemo(() => {
    if (!data?.year_totals) return [];
    return data.year_totals.map((d) => ({
      year: d.year,
      gwh: toGWh(d.sum_kwh),
      shorePower: toGWh(d.sum_kwh_shore_power),
    }));
  }, [data]);

  // Table: type × size
  const tableData = useMemo(() => {
    if (!data) return [];
    const yearData = data.by_type_and_size?.filter((d) => d.year === year) || [];
    
    const byType = {};
    yearData.forEach((d) => {
      if (!byType[d.vessel_type]) byType[d.vessel_type] = { type: d.vessel_type, sizes: {}, total: 0 };
      byType[d.vessel_type].sizes[d.gt_group] = toGWh(d.sum_kwh);
      byType[d.vessel_type].total += toGWh(d.sum_kwh);
    });
    
    return Object.values(byType).sort((a, b) => b.total - a.total);
  }, [data, year]);

  // Size column totals
  const sizeTotals = useMemo(() => {
    const totals = {};
    GT_ORDER.forEach((g) => {
      totals[g] = tableData.reduce((s, r) => s + (r.sizes[g] || 0), 0);
    });
    return totals;
  }, [tableData]);

  if (loading) return <div className="p-8 text-gray-500">Laster data...</div>;
  if (error) return <div className="p-8 text-red-600">Feil: {error}</div>;

  const totalGWh = toGWh(filtered.total);
  const shorePowerGWh = toGWh(filtered.shorePower);
  const co2kt = filtered.co2 / 1000;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {/* Header - minimal */}
        <header className="mb-6 border-b border-gray-200 pb-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Kystverket MarU
          </div>
          <h1 className="text-2xl font-light text-gray-800">
            Maritim energibehov
          </h1>
        </header>

        {/* Filters - clean row */}
        <section className="flex flex-wrap gap-4 mb-6 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">År</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Trafikktype</label>
            <select
              value={voyageType}
              onChange={(e) => setVoyageType(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
            >
              {Object.entries(VOYAGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {voyageType !== "all" && (
            <div className="text-xs text-amber-600 self-center">
              ⚠ Detaljdata kun tilgjengelig for «Alle»
            </div>
          )}
        </section>

        {/* Key metrics - sparse, Tufte-style */}
        <section className="grid grid-cols-3 gap-8 mb-8 py-4 border-y border-gray-100">
          <div>
            <div className="text-3xl font-light tabular-nums">{nb(totalGWh, 0)}</div>
            <div className="text-xs text-gray-500 mt-1">GWh totalt energibehov</div>
          </div>
          <div>
            <div className="text-3xl font-light tabular-nums">{nb(shorePowerGWh, 0)}</div>
            <div className="text-xs text-gray-500 mt-1">GWh landstrøm</div>
          </div>
          <div>
            <div className="text-3xl font-light tabular-nums">{nb(co2kt, 0)}</div>
            <div className="text-xs text-gray-500 mt-1">kt CO₂</div>
          </div>
        </section>

        {/* Main table - the core data */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Energibehov (GWh) etter skipstype og størrelse — {year}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">Skipstype</th>
                  {GT_ORDER.map((g) => (
                    <th key={g} className="text-right py-2 px-2 font-medium text-gray-600 whitespace-nowrap">
                      {GT_LABELS[g]}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-4 font-medium text-gray-900">Sum</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={row.type} className={i % 2 ? "bg-gray-50" : ""}>
                    <td className="py-1.5 pr-4 text-gray-800">{row.type}</td>
                    {GT_ORDER.map((g) => (
                      <td key={g} className="py-1.5 px-2 text-right tabular-nums text-gray-600">
                        {row.sizes[g] ? nb(row.sizes[g], 1) : ""}
                      </td>
                    ))}
                    <td className="py-1.5 pl-4 text-right tabular-nums font-medium text-gray-900">
                      {nb(row.total, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300 font-medium">
                  <td className="py-2 pr-4 text-gray-900">Sum</td>
                  {GT_ORDER.map((g) => (
                    <td key={g} className="py-2 px-2 text-right tabular-nums text-gray-700">
                      {sizeTotals[g] ? nb(sizeTotals[g], 1) : ""}
                    </td>
                  ))}
                  <td className="py-2 pl-4 text-right tabular-nums text-gray-900">
                    {nb(totalGWh, 1)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Charts - minimal, supportive */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* By type */}
          <div>
            <h3 className="text-xs font-medium text-gray-600 mb-2">Per skipstype</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={filtered.byType} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => nb(v)} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip content={<MinimalTooltip />} />
                  <Bar dataKey="gwh" fill="#374151" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* By phase */}
          <div>
            <h3 className="text-xs font-medium text-gray-600 mb-2">Per operasjonsfase</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={filtered.byPhase} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => nb(v)} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip content={<MinimalTooltip />} />
                  <Bar dataKey="gwh" fill="#6b7280" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Trend - simple line */}
        <section className="mb-8">
          <h3 className="text-xs font-medium text-gray-600 mb-2">Utvikling 2016–2025</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e5e7eb" />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => nb(v)} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-300 px-2 py-1 text-xs shadow-sm">
                      <div><strong>{label}</strong></div>
                      <div>Totalt: {nb(payload[0]?.value, 0)} GWh</div>
                      <div>Landstrøm: {nb(payload[1]?.value, 0)} GWh</div>
                    </div>
                  );
                }} />
                <Line type="monotone" dataKey="gwh" stroke="#374151" strokeWidth={1.5} dot={{ r: 2 }} name="Totalt" />
                <Line type="monotone" dataKey="shorePower" stroke="#059669" strokeWidth={1.5} dot={{ r: 2 }} name="Landstrøm" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs text-gray-500 mt-2">
            <span><span className="inline-block w-3 h-0.5 bg-gray-700 mr-1"></span>Totalt energibehov</span>
            <span><span className="inline-block w-3 h-0.5 bg-emerald-600 mr-1"></span>Landstrøm</span>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-xs text-gray-400 border-t border-gray-100 pt-4">
          <p>
            Kilde: Kystverket MarU — {nb(data?.metadata?.total_records || 0)} datapunkter, {years[0]}–{years[years.length - 1]}.
            {" "}
            <a href="https://github.com/Kystverket/maru" className="underline hover:text-gray-600">github.com/Kystverket/maru</a>
          </p>
        </footer>
      </div>
    </div>
  );
}
