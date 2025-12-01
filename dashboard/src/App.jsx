import { useMemo, useState, useEffect } from "react";

// --- Minimal helpers ---
function n(val, decimals = 0) {
  if (val === undefined || val === null || isNaN(val)) return "–";
  return val.toLocaleString("nb-NO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ============================================
// MARU TAB - Shipping emissions
// ============================================

const MEASURES = {
  sum_kwh: { label: "Energibehov", unit: "GWh", div: 1e6 },
  sum_kwh_shore_power: { label: "Landstrøm", unit: "GWh", div: 1e6 },
  sum_co2_tonnes: { label: "CO₂", unit: "kt", div: 1000 },
  sum_nox_tonnes: { label: "NOx", unit: "tonn", div: 1 },
  sum_sox_tonnes: { label: "SOx", unit: "tonn", div: 1 },
  sum_pm10_tonnes: { label: "PM10", unit: "tonn", div: 1 },
};

const GT_LABELS = {
  "gt1, 0-399": "<400", "gt2, 400-999": "400–1k", "gt3, 1000-2999": "1–3k",
  "gt4, 3000-4999": "3–5k", "gt5, 5000-9999": "5–10k", "gt6, 10000-24999": "10–25k",
  "gt7, 25000-49999": "25–50k", "gt8, 50000-99999": "50–100k", "gt9, >=100 000": ">100k",
};
const GT_ORDER = Object.keys(GT_LABELS);

const VOYAGE = { domestic: "Innenriks", international_in: "Inn", international_out: "Ut", berthed: "Kai", transit: "Transit" };
const PHASE = { "Node (berth)": "Kai", Cruise: "Seilas", Maneuver: "Manøver", Anchor: "Anker", Fishing: "Fiske" };

function MaruTab({ data }) {
  const [year, setYear] = useState(2024);
  const [voyage, setVoyage] = useState("all");
  const [phase, setPhase] = useState("all");
  const [county, setCounty] = useState("all");
  const [measure, setMeasure] = useState("sum_kwh");

  const f = data?.filters || {};
  const m = MEASURES[measure];

  const { rows, colTotals, total } = useMemo(() => {
    if (!data?.data) return { rows: [], colTotals: {}, total: 0 };
    
    let recs = data.data.filter(d => d.year === year);
    if (voyage !== "all") recs = recs.filter(d => d.voyage_type === voyage);
    if (phase !== "all") recs = recs.filter(d => d.phase === phase);
    if (county !== "all") recs = recs.filter(d => d.county_name === county);

    const agg = {};
    recs.forEach(r => {
      const t = r.vessel_type, s = r.gt_group, v = (r[measure] || 0) / m.div;
      if (!agg[t]) agg[t] = { type: t, cols: {}, sum: 0 };
      agg[t].cols[s] = (agg[t].cols[s] || 0) + v;
      agg[t].sum += v;
    });

    const rows = Object.values(agg).sort((a, b) => b.sum - a.sum);
    const colTotals = {};
    GT_ORDER.forEach(g => { colTotals[g] = rows.reduce((s, r) => s + (r.cols[g] || 0), 0); });
    const total = rows.reduce((s, r) => s + r.sum, 0);
    return { rows, colTotals, total };
  }, [data, year, voyage, phase, county, measure, m]);

  const activeFilters = [voyage !== "all", phase !== "all", county !== "all"].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Controls - minimal inline */}
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
        <select value={year} onChange={e => setYear(+e.target.value)} className="bg-transparent font-medium">
          {(f.years || []).map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={measure} onChange={e => setMeasure(e.target.value)} className="bg-transparent text-gray-600">
          {Object.entries(MEASURES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={voyage} onChange={e => setVoyage(e.target.value)} className="bg-transparent text-gray-500">
          <option value="all">Alle trafikktyper</option>
          {(f.voyage_types || []).map(v => <option key={v} value={v}>{VOYAGE[v] || v}</option>)}
        </select>
        <select value={phase} onChange={e => setPhase(e.target.value)} className="bg-transparent text-gray-500">
          <option value="all">Alle faser</option>
          {(f.phases || []).map(p => <option key={p} value={p}>{PHASE[p] || p}</option>)}
        </select>
        <select value={county} onChange={e => setCounty(e.target.value)} className="bg-transparent text-gray-500">
          <option value="all">Alle fylker</option>
          {(f.counties || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {activeFilters > 0 && <button onClick={() => { setVoyage("all"); setPhase("all"); setCounty("all"); }} className="text-gray-400 hover:text-gray-600">×</button>}
      </div>

      {/* Key figure */}
      <div className="text-4xl tabular-nums font-light">
        {n(total, 0)} <span className="text-lg text-gray-500">{m.unit}</span>
      </div>

      {/* Data table - Tufte style: minimal lines, data-focused */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs">
            <th className="text-left font-normal py-1 pr-4">GT →</th>
            {GT_ORDER.map(g => <th key={g} className="text-right font-normal px-1 whitespace-nowrap">{GT_LABELS[g]}</th>)}
            <th className="text-right font-normal pl-3">Σ</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r, i) => (
            <tr key={r.type} className={i === 0 ? "border-t border-gray-200" : ""}>
              <td className="py-0.5 pr-4 text-gray-700">{r.type}</td>
              {GT_ORDER.map(g => (
                <td key={g} className="px-1 text-right text-gray-500">{r.cols[g] ? n(r.cols[g], 1) : <span className="text-gray-200">·</span>}</td>
              ))}
              <td className="pl-3 text-right font-medium text-gray-800">{n(r.sum, 1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-300 text-gray-600">
            <td className="py-1 pr-4">Σ</td>
            {GT_ORDER.map(g => <td key={g} className="px-1 text-right">{colTotals[g] ? n(colTotals[g], 0) : ""}</td>)}
            <td className="pl-3 text-right font-semibold text-gray-900">{n(total, 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ============================================
// GRID TAB - Network capacity
// ============================================

function GridTab({ data }) {
  const [search, setSearch] = useState("");
  const [fylke, setFylke] = useState("all");
  const [kommune, setKommune] = useState("all");
  const [expanded, setExpanded] = useState(new Set());

  const { ops, locs, fylker, kommuner, totals } = useMemo(() => {
    if (!data?.grid_operators) return { ops: [], locs: [], fylker: [], kommuner: [], totals: {} };

    const ops = Object.entries(data.grid_operators)
      .map(([id, o]) => ({
        id, name: o.publisher || id.toUpperCase(), count: o.feature_count,
        locs: (o.locations || []).sort((a, b) => (b.available_consumption || 0) - (a.available_consumption || 0)),
        mw: (o.locations || []).reduce((s, l) => s + (l.available_consumption || 0), 0),
      }))
      .sort((a, b) => b.mw - a.mw);

    const locs = ops.flatMap(o => o.locs.map(l => ({ ...l, op: o.name, opId: o.id })));
    const fylker = [...new Set(locs.map(l => l.fylke).filter(Boolean))].sort();
    const kommuner = [...new Set(locs.map(l => l.kommune).filter(Boolean))].sort();
    const totals = { n: locs.length, ops: ops.length, mw: locs.reduce((s, l) => s + (l.available_consumption || 0), 0) };

    return { ops, locs, fylker, kommuner, totals };
  }, [data]);

  const filtered = useMemo(() => {
    let f = locs;
    if (search) { const s = search.toLowerCase(); f = f.filter(l => l.name?.toLowerCase().includes(s) || l.kommune?.toLowerCase().includes(s)); }
    if (fylke !== "all") f = f.filter(l => l.fylke === fylke);
    if (kommune !== "all") f = f.filter(l => l.kommune === kommune);
    return f;
  }, [locs, search, fylke, kommune]);

  const opsFiltered = useMemo(() => {
    return ops.map(o => {
      const fl = filtered.filter(l => l.opId === o.id);
      return { ...o, fl, fmw: fl.reduce((s, l) => s + (l.available_consumption || 0), 0) };
    }).filter(o => o.fl.length > 0);
  }, [ops, filtered]);

  const toggle = id => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-6">
      {/* Key figures */}
      <div className="flex gap-8 text-sm">
        <div><span className="text-2xl tabular-nums font-light">{n(totals.n)}</span> <span className="text-gray-500">stasjoner</span></div>
        <div><span className="text-2xl tabular-nums font-light">{n(totals.mw)}</span> <span className="text-gray-500">MW tilgjengelig</span></div>
        <div><span className="text-2xl tabular-nums font-light">{n(totals.ops)}</span> <span className="text-gray-500">nettselskaper</span></div>
      </div>

      {/* Filters - minimal */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 text-sm">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Søk..."
          className="bg-transparent border-b border-gray-300 focus:border-gray-500 outline-none px-0 py-1 w-48"
        />
        <select value={fylke} onChange={e => { setFylke(e.target.value); setKommune("all"); }} className="bg-transparent text-gray-600">
          <option value="all">Alle fylker</option>
          {fylker.map(f => <option key={f}>{f}</option>)}
        </select>
        <select value={kommune} onChange={e => setKommune(e.target.value)} className="bg-transparent text-gray-600">
          <option value="all">Alle kommuner</option>
          {kommuner.filter(k => fylke === "all" || locs.some(l => l.kommune === k && l.fylke === fylke)).map(k => <option key={k}>{k}</option>)}
        </select>
        {(search || fylke !== "all" || kommune !== "all") && (
          <>
            <span className="text-gray-400">→ {filtered.length} stasjoner, {n(filtered.reduce((s, l) => s + (l.available_consumption || 0), 0))} MW</span>
            <button onClick={() => { setSearch(""); setFylke("all"); setKommune("all"); }} className="text-gray-400 hover:text-gray-600">×</button>
          </>
        )}
      </div>

      {/* Expand controls */}
      <div className="text-xs text-gray-400 space-x-3">
        <button onClick={() => setExpanded(new Set(ops.map(o => o.id)))} className="hover:text-gray-600">Vis alle</button>
        <button onClick={() => setExpanded(new Set())} className="hover:text-gray-600">Skjul</button>
      </div>

      {/* Operators list - Tufte: data-dense, minimal chrome */}
      <div className="space-y-1">
        {opsFiltered.map(o => (
          <div key={o.id}>
            <button onClick={() => toggle(o.id)} className="w-full flex items-baseline gap-2 py-1 text-left hover:bg-gray-50 -mx-2 px-2 rounded">
              <span className="text-gray-400 text-xs w-4">{expanded.has(o.id) ? "−" : "+"}</span>
              <span className="font-medium text-gray-800">{o.name}</span>
              <span className="text-gray-400 text-sm">{o.fl.length}</span>
              <span className="flex-1" />
              <span className="tabular-nums text-gray-600">{n(o.fmw)} <span className="text-gray-400 text-xs">MW</span></span>
            </button>
            
            {expanded.has(o.id) && (
              <div className="ml-6 mb-3 text-sm">
                <table className="w-full">
                  <tbody className="tabular-nums">
                    {o.fl.map((l, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-0.5 text-gray-700">{l.name}</td>
                        <td className="py-0.5 text-gray-400 text-xs">{l.kommune}</td>
                        <td className={`py-0.5 text-right ${l.available_consumption > 10 ? "text-emerald-700" : "text-gray-500"}`}>
                          {n(l.available_consumption || 0, 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================

export default function App() {
  const [tab, setTab] = useState("maru");
  const [maru, setMaru] = useState(null);
  const [grid, setGrid] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/maru_data.json").then(r => r.json()), fetch("/grid_index.json").then(r => r.json())])
      .then(([m, g]) => { setMaru(m); setGrid(g); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 text-gray-400">Laster...</div>;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header - minimal */}
        <header className="mb-8">
          <h1 className="text-lg font-medium">Elektrisk Skipsfart</h1>
          <p className="text-sm text-gray-500">Maritim energibehov og nettkapasitet i Norge</p>
        </header>

        {/* Tabs - understated */}
        <nav className="flex gap-6 mb-8 text-sm border-b border-gray-100 pb-2">
          <button onClick={() => setTab("maru")} className={tab === "maru" ? "text-gray-900 font-medium" : "text-gray-400 hover:text-gray-600"}>
            Skipsfart
          </button>
          <button onClick={() => setTab("grid")} className={tab === "grid" ? "text-gray-900 font-medium" : "text-gray-400 hover:text-gray-600"}>
            Nettkapasitet
          </button>
        </nav>

        {/* Content */}
        {tab === "maru" && maru && <MaruTab data={maru} />}
        {tab === "grid" && grid && <GridTab data={grid} />}

        {/* Footer - minimal */}
        <footer className="mt-12 pt-6 border-t border-gray-100 text-xs text-gray-400">
          Data: <a href="https://github.com/Kystverket/maru" className="hover:text-gray-600">Kystverket MarU</a> · <a href="https://wattapp.no" className="hover:text-gray-600">WattApp/Elhub</a>
        </footer>
      </div>
    </div>
  );
}
