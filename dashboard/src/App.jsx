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

// Sortable column header
function SortHeader({ label, field, sortBy, sortDir, onSort }) {
  const active = sortBy === field;
  return (
    <th 
      onClick={() => onSort(field)} 
      className={`text-right font-normal px-2 py-1 cursor-pointer hover:bg-gray-50 whitespace-nowrap ${active ? "text-gray-900" : "text-gray-500"}`}
    >
      {label} {active && (sortDir === "desc" ? "↓" : "↑")}
    </th>
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

      <div className="text-3xl tabular-nums">{n(total, 0)} <span className="text-base text-gray-500">{m.unit}</span></div>

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
// GRID TAB - Simple sortable table
// ============================================

function GridTab({ data }) {
  const [search, setSearch] = useState("");
  const [fylke, setFylke] = useState("all");
  const [kommune, setKommune] = useState("all");
  const [sortBy, setSortBy] = useState("ledigForbruk");
  const [sortDir, setSortDir] = useState("desc");

  const { stations, fylker, kommuner, totals } = useMemo(() => {
    if (!data?.grid_operators) return { stations: [], fylker: [], kommuner: [], totals: {} };

    const stations = Object.entries(data.grid_operators).flatMap(([id, o]) =>
      (o.locations || []).map(l => {
        const prod = l.available_production || 0;
        return { 
          name: l.name,
          kommune: l.kommune || "–",
          fylke: l.fylke || "–",
          nettselskap: o.publisher || id.toUpperCase(),
          ledigForbruk: l.available_consumption || 0,  // Plass til nytt forbruk
          reservert: l.reserved_consumption || 0,       // Allerede reservert
          // availableProd: positiv = kan ta ny produksjon, negativ = har overskudd (bra for forbruk!)
          ledigProduksjon: prod > 0 ? prod : 0,         // Plass til ny produksjon
          overskudd: prod < 0 ? Math.abs(prod) : 0,     // Eksisterende overskuddsproduksjon
        };
      })
    );

    const totals = {
      n: stations.length,
      ledigForbruk: stations.reduce((s, l) => s + l.ledigForbruk, 0),
      reservert: stations.reduce((s, l) => s + l.reservert, 0),
      overskudd: stations.reduce((s, l) => s + l.overskudd, 0),
    };

    return { 
      stations, 
      fylker: [...new Set(stations.map(l => l.fylke).filter(f => f !== "–"))].sort(),
      kommuner: [...new Set(stations.map(l => l.kommune).filter(k => k !== "–"))].sort(),
      totals 
    };
  }, [data]);

  const filtered = useMemo(() => {
    let f = stations;
    if (search) { 
      const s = search.toLowerCase(); 
      f = f.filter(l => l.name?.toLowerCase().includes(s) || l.kommune?.toLowerCase().includes(s) || l.nettselskap?.toLowerCase().includes(s)); 
    }
    if (fylke !== "all") f = f.filter(l => l.fylke === fylke);
    if (kommune !== "all") f = f.filter(l => l.kommune === kommune);
    
    // Sort
    f = [...f].sort((a, b) => {
      const aVal = a[sortBy] ?? "";
      const bVal = b[sortBy] ?? "";
      if (typeof aVal === "number") return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      return sortDir === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    });
    
    return f;
  }, [stations, search, fylke, kommune, sortBy, sortDir]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  const filteredTotals = useMemo(() => ({
    n: filtered.length,
    ledigForbruk: filtered.reduce((s, l) => s + l.ledigForbruk, 0),
    reservert: filtered.reduce((s, l) => s + l.reservert, 0),
    overskudd: filtered.reduce((s, l) => s + l.overskudd, 0),
  }), [filtered]);

  const isFiltered = search || fylke !== "all" || kommune !== "all";

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-6 text-sm border-b border-gray-100 pb-3">
        <div><span className="text-2xl tabular-nums">{n(isFiltered ? filteredTotals.n : totals.n)}</span> <span className="text-gray-500">stasjoner</span></div>
        <div><span className="text-2xl tabular-nums text-emerald-700">{n(isFiltered ? filteredTotals.ledigForbruk : totals.ledigForbruk)}</span> <span className="text-gray-500">MW ledig for forbruk</span></div>
        <div><span className="text-2xl tabular-nums text-blue-600">{n(isFiltered ? filteredTotals.overskudd : totals.overskudd)}</span> <span className="text-gray-500">MW overskuddskraft</span></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 text-sm items-baseline">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Søk stasjon, kommune, nettselskap..."
          className="border-b border-gray-300 focus:border-gray-500 outline-none py-1 w-64 bg-transparent" />
        <SearchSelect value={fylke} onChange={v => { setFylke(v); setKommune("all"); }} options={fylker} placeholder="Søk fylke..." allLabel="Alle fylker" />
        <SearchSelect value={kommune} onChange={setKommune} 
          options={kommuner.filter(k => fylke === "all" || stations.some(l => l.kommune === k && l.fylke === fylke))} 
          placeholder="Søk kommune..." allLabel="Alle kommuner" />
        {isFiltered && <button onClick={() => { setSearch(""); setFylke("all"); setKommune("all"); }} className="text-gray-400 hover:text-gray-600">× Nullstill</button>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs border-b border-gray-200">
              <th onClick={() => handleSort("name")} className={`text-left font-normal px-2 py-2 cursor-pointer hover:bg-gray-50 ${sortBy === "name" ? "text-gray-900" : "text-gray-500"}`}>
                Stasjon {sortBy === "name" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
              <th onClick={() => handleSort("kommune")} className={`text-left font-normal px-2 py-2 cursor-pointer hover:bg-gray-50 ${sortBy === "kommune" ? "text-gray-900" : "text-gray-500"}`}>
                Kommune {sortBy === "kommune" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
              <th onClick={() => handleSort("fylke")} className={`text-left font-normal px-2 py-2 cursor-pointer hover:bg-gray-50 ${sortBy === "fylke" ? "text-gray-900" : "text-gray-500"}`}>
                Fylke {sortBy === "fylke" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
              <th onClick={() => handleSort("nettselskap")} className={`text-left font-normal px-2 py-2 cursor-pointer hover:bg-gray-50 ${sortBy === "nettselskap" ? "text-gray-900" : "text-gray-500"}`}>
                Nettselskap {sortBy === "nettselskap" && (sortDir === "desc" ? "↓" : "↑")}
              </th>
              <SortHeader label="Ledig forbruk" field="ledigForbruk" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Reservert" field="reservert" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Overskudd" field="overskudd" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {filtered.slice(0, 100).map((s, i) => (
              <tr key={i} className={i % 2 ? "bg-gray-50" : ""}>
                <td className="px-2 py-1 text-gray-900">{s.name}</td>
                <td className="px-2 py-1 text-gray-600">{s.kommune}</td>
                <td className="px-2 py-1 text-gray-500">{s.fylke}</td>
                <td className="px-2 py-1 text-gray-500">{s.nettselskap}</td>
                <td className={`px-2 py-1 text-right ${s.ledigForbruk > 10 ? "text-emerald-700 font-medium" : s.ledigForbruk > 0 ? "text-gray-700" : "text-gray-300"}`}>
                  {s.ledigForbruk > 0 ? n(s.ledigForbruk, 1) : "–"}
                </td>
                <td className={`px-2 py-1 text-right ${s.reservert > 0 ? "text-amber-600" : "text-gray-300"}`}>
                  {s.reservert > 0 ? n(s.reservert, 1) : "–"}
                </td>
                <td className={`px-2 py-1 text-right ${s.overskudd > 10 ? "text-blue-600 font-medium" : s.overskudd > 0 ? "text-blue-500" : "text-gray-300"}`}>
                  {s.overskudd > 0 ? n(s.overskudd, 1) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div className="text-xs text-gray-400 mt-2 px-2">Viser 100 av {filtered.length} stasjoner. Bruk filter for å begrense.</div>
        )}
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded">
        <div><span className="text-emerald-700 font-medium">Ledig forbruk</span> = Kapasitet for nytt strømforbruk (f.eks. landstrøm til skip)</div>
        <div><span className="text-amber-600 font-medium">Reservert</span> = Allerede booket kapasitet</div>
        <div><span className="text-blue-600 font-medium">Overskudd</span> = Området har overskuddsproduksjon – gunstig for nytt forbruk!</div>
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
      <div className="max-w-6xl mx-auto px-6 py-6">
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
