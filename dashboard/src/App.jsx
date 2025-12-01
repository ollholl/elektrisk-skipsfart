import { useMemo, useState, useEffect, useRef } from "react";

// --- Helpers ---
function n(val, d = 0) {
  if (val === undefined || val === null || isNaN(val)) return "–";
  return val.toLocaleString("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// Searchable select
function SearchSelect({ value, onChange, options, placeholder, allLabel = "Alle" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  const display = value === "all" ? allLabel : value;

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => { setOpen(!open); setSearch(""); }} className="text-gray-600 hover:text-gray-900">
        {display} <span className="text-gray-400 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded shadow-lg min-w-48 max-h-64 overflow-hidden">
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder}
            className="w-full px-3 py-2 border-b border-gray-100 text-sm outline-none" />
          <div className="overflow-y-auto max-h-48">
            <button onClick={() => { onChange("all"); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${value === "all" ? "font-medium" : "text-gray-600"}`}>
              {allLabel}
            </button>
            {filtered.map(o => (
              <button key={o} onClick={() => { onChange(o); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${value === o ? "font-medium" : "text-gray-600"}`}>
                {o}
              </button>
            ))}
            {!filtered.length && <div className="px-3 py-2 text-sm text-gray-400">Ingen treff</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MARU TAB
// ============================================

const MEASURES = {
  sum_kwh: { label: "Energi", unit: "GWh", div: 1e6 },
  sum_kwh_shore_power: { label: "Landstrøm", unit: "GWh", div: 1e6 },
  sum_co2_tonnes: { label: "CO₂", unit: "kt", div: 1000 },
  sum_nox_tonnes: { label: "NOx", unit: "t", div: 1 },
};

const GT = { "gt1, 0-399": "<400", "gt2, 400-999": "4–1k", "gt3, 1000-2999": "1–3k", "gt4, 3000-4999": "3–5k", 
  "gt5, 5000-9999": "5–10k", "gt6, 10000-24999": "10–25k", "gt7, 25000-49999": "25–50k", "gt8, 50000-99999": "50–100k", "gt9, >=100 000": ">100k" };
const GT_ORDER = Object.keys(GT);

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
    return { rows, colTotals, total: rows.reduce((s, r) => s + r.sum, 0) };
  }, [data, year, voyage, phase, county, measure, m]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <select value={year} onChange={e => setYear(+e.target.value)} className="bg-transparent font-medium text-gray-900">
          {(f.years || []).map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={measure} onChange={e => setMeasure(e.target.value)} className="bg-transparent">
          {Object.entries(MEASURES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={voyage} onChange={e => setVoyage(e.target.value)} className="bg-transparent text-gray-500">
          <option value="all">Alle reiser</option>
          {(f.voyage_types || []).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={phase} onChange={e => setPhase(e.target.value)} className="bg-transparent text-gray-500">
          <option value="all">Alle faser</option>
          {(f.phases || []).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <SearchSelect value={county} onChange={setCounty} options={f.counties || []} placeholder="Søk..." allLabel="Alle fylker" />
      </div>

      {/* Key figure */}
      <div className="text-3xl tabular-nums">{n(total, 0)} <span className="text-base text-gray-500">{m.unit}</span></div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-gray-400">
          <th className="text-left font-normal py-1">Skipstype \ GT</th>
          {GT_ORDER.map(g => <th key={g} className="text-right font-normal px-1">{GT[g]}</th>)}
          <th className="text-right font-normal pl-2">Σ</th>
        </tr></thead>
        <tbody className="tabular-nums">
          {rows.map(r => (
            <tr key={r.type}>
              <td className="py-0.5 text-gray-700 text-xs">{r.type}</td>
              {GT_ORDER.map(g => <td key={g} className="px-1 text-right text-gray-400">{r.cols[g] ? n(r.cols[g], 0) : "·"}</td>)}
              <td className="pl-2 text-right text-gray-700">{n(r.sum, 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="border-t border-gray-200 text-gray-600">
          <td className="py-1 text-xs">Σ</td>
          {GT_ORDER.map(g => <td key={g} className="px-1 text-right">{n(colTotals[g], 0)}</td>)}
          <td className="pl-2 text-right font-medium text-gray-900">{n(total, 0)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

// ============================================
// GRID TAB - with power balance
// ============================================

function GridTab({ data }) {
  const [search, setSearch] = useState("");
  const [fylke, setFylke] = useState("all");
  const [kommune, setKommune] = useState("all");
  const [expanded, setExpanded] = useState(new Set());
  const [expandedK, setExpandedK] = useState(new Set());

  const { locs, fylker, kommuner, totals, byGeo } = useMemo(() => {
    if (!data?.grid_operators) return { locs: [], fylker: [], kommuner: [], totals: {}, byGeo: {} };

    const locs = Object.entries(data.grid_operators).flatMap(([id, o]) =>
      (o.locations || []).map(l => ({ 
        ...l, 
        nettselskap: o.publisher || id.toUpperCase(),
        // Calculate balance: positive = net consumer capacity, negative = net producer
        forbruk: l.available_consumption || 0,
        produksjon: Math.abs(l.available_production || 0),
        reservert: l.reserved_consumption || 0,
      }))
    );

    const totals = {
      n: locs.length,
      forbruk: locs.reduce((s, l) => s + l.forbruk, 0),
      produksjon: locs.reduce((s, l) => s + l.produksjon, 0),
      reservert: locs.reduce((s, l) => s + l.reservert, 0),
    };

    const byGeo = {};
    locs.forEach(l => {
      const f = l.fylke || "Ukjent", k = l.kommune || "Ukjent";
      if (!byGeo[f]) byGeo[f] = { kommuner: {}, forbruk: 0, produksjon: 0, n: 0 };
      if (!byGeo[f].kommuner[k]) byGeo[f].kommuner[k] = { stasjoner: [], forbruk: 0, produksjon: 0 };
      byGeo[f].kommuner[k].stasjoner.push(l);
      byGeo[f].kommuner[k].forbruk += l.forbruk;
      byGeo[f].kommuner[k].produksjon += l.produksjon;
      byGeo[f].forbruk += l.forbruk;
      byGeo[f].produksjon += l.produksjon;
      byGeo[f].n++;
    });

    Object.values(byGeo).forEach(f => Object.values(f.kommuner).forEach(k => 
      k.stasjoner.sort((a, b) => b.forbruk - a.forbruk)
    ));

    return { 
      locs, 
      fylker: [...new Set(locs.map(l => l.fylke).filter(Boolean))].sort(),
      kommuner: [...new Set(locs.map(l => l.kommune).filter(Boolean))].sort(),
      totals, byGeo 
    };
  }, [data]);

  const filteredGeo = useMemo(() => {
    const result = {};
    const s = search.toLowerCase();
    Object.entries(byGeo).forEach(([fN, fD]) => {
      if (fylke !== "all" && fN !== fylke) return;
      const fK = {};
      Object.entries(fD.kommuner).forEach(([kN, kD]) => {
        if (kommune !== "all" && kN !== kommune) return;
        let st = kD.stasjoner;
        if (search) st = st.filter(x => x.name?.toLowerCase().includes(s) || x.nettselskap?.toLowerCase().includes(s));
        if (st.length) fK[kN] = { stasjoner: st, forbruk: st.reduce((a,b) => a + b.forbruk, 0), produksjon: st.reduce((a,b) => a + b.produksjon, 0) };
      });
      if (Object.keys(fK).length) result[fN] = { kommuner: fK, 
        forbruk: Object.values(fK).reduce((a,b) => a + b.forbruk, 0),
        produksjon: Object.values(fK).reduce((a,b) => a + b.produksjon, 0),
        n: Object.values(fK).reduce((a,b) => a + b.stasjoner.length, 0) };
    });
    return result;
  }, [byGeo, fylke, kommune, search]);

  const toggle = (set, setFn, id) => setFn(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Balance indicator: shows if area is net producer or consumer
  const Balance = ({ forbruk, produksjon }) => {
    const diff = forbruk - produksjon;
    if (Math.abs(diff) < 1) return null;
    return <span className={`text-xs ${diff > 0 ? "text-amber-600" : "text-emerald-600"}`}>
      {diff > 0 ? "↑" : "↓"}{n(Math.abs(diff))}
    </span>;
  };

  return (
    <div className="space-y-4">
      {/* Key figures - Tufte: integrated, comparable */}
      <div className="grid grid-cols-4 gap-4 text-sm py-3 border-b border-gray-100">
        <div>
          <div className="text-2xl tabular-nums">{n(totals.n)}</div>
          <div className="text-xs text-gray-400">stasjoner</div>
        </div>
        <div>
          <div className="text-2xl tabular-nums text-emerald-700">{n(totals.forbruk)}</div>
          <div className="text-xs text-gray-400">MW forbruk ledig</div>
        </div>
        <div>
          <div className="text-2xl tabular-nums text-blue-700">{n(totals.produksjon)}</div>
          <div className="text-xs text-gray-400">MW produksjon ledig</div>
        </div>
        <div>
          <div className="text-2xl tabular-nums text-gray-400">{n(totals.reservert)}</div>
          <div className="text-xs text-gray-400">MW reservert</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 text-sm items-baseline">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Søk stasjon..."
          className="border-b border-gray-300 focus:border-gray-500 outline-none py-1 w-40 bg-transparent" />
        <SearchSelect value={fylke} onChange={v => { setFylke(v); setKommune("all"); }} options={fylker} placeholder="Søk fylke..." allLabel="Alle fylker" />
        <SearchSelect value={kommune} onChange={setKommune} 
          options={kommuner.filter(k => fylke === "all" || locs.some(l => l.kommune === k && l.fylke === fylke))} 
          placeholder="Søk kommune..." allLabel="Alle kommuner" />
        {(search || fylke !== "all" || kommune !== "all") && 
          <button onClick={() => { setSearch(""); setFylke("all"); setKommune("all"); }} className="text-gray-400 hover:text-gray-600">×</button>}
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-400 flex gap-4">
        <span><span className="text-emerald-600">Forbruk</span> = ledig kapasitet for nytt forbruk</span>
        <span><span className="text-blue-600">Prod</span> = ledig kapasitet for ny produksjon</span>
      </div>

      {/* Controls */}
      <div className="text-xs text-gray-400 space-x-2">
        <button onClick={() => { setExpanded(new Set(Object.keys(filteredGeo))); setExpandedK(new Set(Object.values(filteredGeo).flatMap(f => Object.keys(f.kommuner)))); }} 
          className="hover:text-gray-600">Vis alle</button>
        <button onClick={() => { setExpanded(new Set()); setExpandedK(new Set()); }} className="hover:text-gray-600">Skjul</button>
      </div>

      {/* Geographic hierarchy */}
      <div className="space-y-0.5">
        {Object.entries(filteredGeo).sort(([,a],[,b]) => b.forbruk - a.forbruk).map(([fN, fD]) => (
          <div key={fN}>
            <button onClick={() => toggle(expanded, setExpanded, fN)} 
              className="w-full flex items-baseline gap-2 py-1 hover:bg-gray-50 -mx-1 px-1 rounded text-left">
              <span className="text-gray-400 text-xs w-3">{expanded.has(fN) ? "−" : "+"}</span>
              <span className="font-medium">{fN}</span>
              <span className="text-gray-400 text-xs">{fD.n}</span>
              <span className="flex-1" />
              <span className="tabular-nums text-sm">
                <span className="text-emerald-700">{n(fD.forbruk)}</span>
                <span className="text-gray-300 mx-1">/</span>
                <span className="text-blue-700">{n(fD.produksjon)}</span>
              </span>
              <Balance forbruk={fD.forbruk} produksjon={fD.produksjon} />
            </button>

            {expanded.has(fN) && (
              <div className="ml-3 border-l border-gray-100 pl-2">
                {Object.entries(fD.kommuner).sort(([,a],[,b]) => b.forbruk - a.forbruk).map(([kN, kD]) => (
                  <div key={kN}>
                    <button onClick={() => toggle(expandedK, setExpandedK, kN)}
                      className="w-full flex items-baseline gap-2 py-0.5 hover:bg-gray-50 -mx-1 px-1 rounded text-left text-sm">
                      <span className="text-gray-300 text-xs w-3">{expandedK.has(kN) ? "−" : "+"}</span>
                      <span className="text-gray-700">{kN}</span>
                      <span className="text-gray-400 text-xs">{kD.stasjoner.length}</span>
                      <span className="flex-1" />
                      <span className="tabular-nums text-xs">
                        <span className="text-emerald-600">{n(kD.forbruk)}</span>
                        <span className="text-gray-300 mx-1">/</span>
                        <span className="text-blue-600">{n(kD.produksjon)}</span>
                      </span>
                    </button>

                    {expandedK.has(kN) && (
                      <div className="ml-4 border-l border-gray-50 pl-2 text-xs py-1">
                        <table className="w-full">
                          <thead><tr className="text-gray-400">
                            <th className="text-left font-normal">Stasjon</th>
                            <th className="text-left font-normal">Nett</th>
                            <th className="text-right font-normal">Forbruk</th>
                            <th className="text-right font-normal">Prod</th>
                          </tr></thead>
                          <tbody className="tabular-nums">
                            {kD.stasjoner.map((s, i) => (
                              <tr key={i}>
                                <td className="py-0.5 text-gray-700">{s.name}</td>
                                <td className="text-gray-400">{s.nettselskap}</td>
                                <td className={`text-right ${s.forbruk > 10 ? "text-emerald-700 font-medium" : "text-gray-400"}`}>{n(s.forbruk, 1)}</td>
                                <td className={`text-right ${s.produksjon > 10 ? "text-blue-700" : "text-gray-400"}`}>{n(s.produksjon, 1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
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
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <header className="mb-6">
          <h1 className="text-lg font-medium text-gray-900">Elektrisk Skipsfart</h1>
          <p className="text-sm text-gray-500">Maritim energibehov · Nettkapasitet</p>
        </header>

        <nav className="flex gap-6 mb-6 text-sm border-b border-gray-100 pb-2">
          <button onClick={() => setTab("maru")} className={tab === "maru" ? "text-gray-900 font-medium" : "text-gray-400"}>Skipsfart</button>
          <button onClick={() => setTab("grid")} className={tab === "grid" ? "text-gray-900 font-medium" : "text-gray-400"}>Nettkapasitet</button>
        </nav>

        {tab === "maru" && maru && <MaruTab data={maru} />}
        {tab === "grid" && grid && <GridTab data={grid} />}

        <footer className="mt-10 pt-4 border-t border-gray-100 text-xs text-gray-400">
          <a href="https://github.com/Kystverket/maru" className="hover:text-gray-600">Kystverket MarU</a> · <a href="https://wattapp.no" className="hover:text-gray-600">WattApp</a>
        </footer>
      </div>
    </div>
  );
}
