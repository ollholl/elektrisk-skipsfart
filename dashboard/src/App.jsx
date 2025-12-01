import { useMemo, useState, useEffect, useRef } from "react";

// --- Helpers ---
const n = (v, d = 0) => v == null || isNaN(v) ? "–" : v.toLocaleString("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d });

// Searchable select - compact
function Select({ value, onChange, options, all = "Alle" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const filtered = options.filter(o => o.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <span ref={ref} className="relative">
      <button onClick={() => { setOpen(!open); setQ(""); }} className="hover:text-gray-900">
        {value === "all" ? <span className="text-gray-400">{all}</span> : value}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded shadow-lg min-w-44 text-sm">
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Søk..."
            className="w-full px-2 py-1.5 border-b border-gray-100 outline-none" />
          <div className="max-h-48 overflow-y-auto">
            <button onClick={() => { onChange("all"); setOpen(false); }} className="w-full text-left px-2 py-1 hover:bg-gray-50 text-gray-500">{all}</button>
            {filtered.map(o => (
              <button key={o} onClick={() => { onChange(o); setOpen(false); }} className={`w-full text-left px-2 py-1 hover:bg-gray-50 ${value === o ? "font-medium" : ""}`}>{o}</button>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}

// ============================================
// SKIPSFART - Compact matrix
// ============================================

const M = { sum_kwh: ["Energi", "GWh", 1e6], sum_kwh_shore_power: ["Landstrøm", "GWh", 1e6], sum_co2_tonnes: ["CO₂", "kt", 1e3], sum_nox_tonnes: ["NOx", "t", 1] };
const GT = ["gt1, 0-399", "gt2, 400-999", "gt3, 1000-2999", "gt4, 3000-4999", "gt5, 5000-9999", "gt6, 10000-24999", "gt7, 25000-49999", "gt8, 50000-99999", "gt9, >=100 000"];
const GTL = ["<400", "4–1k", "1–3k", "3–5k", "5–10k", "10–25k", "25–50k", "50–100k", ">100k"];

const VOYAGE = { domestic: "Innenriks", international_in: "Fra utland", international_out: "Til utland", berthed: "Ved kai", transit: "Gjennomfart", ncs_facility_proximate: "Offshore" };
const PHASE = { "Node (berth)": "Ved kai", Cruise: "Seilas", Maneuver: "Manøver", Anchor: "Ankring", Fishing: "Fiske", Aquacultur: "Havbruk", "Dynamic positioning offshore": "DP offshore" };

function Skipsfart({ data }) {
  const [year, setYear] = useState(2024);
  const [m, setM] = useState("sum_kwh");
  const [county, setCounty] = useState("all");
  const [voyage, setVoyage] = useState("all");
  const [phase, setPhase] = useState("all");
  const f = data?.filters || {};
  const [label, unit, div] = M[m];

  const { rows, cols, total } = useMemo(() => {
    if (!data?.data) return { rows: [], cols: {}, total: 0 };
    let r = data.data.filter(d => d.year === year);
    if (county !== "all") r = r.filter(d => d.county_name === county);
    if (voyage !== "all") r = r.filter(d => d.voyage_type === voyage);
    if (phase !== "all") r = r.filter(d => d.phase === phase);

    const agg = {};
    r.forEach(d => {
      const t = d.vessel_type, g = d.gt_group, v = (d[m] || 0) / div;
      if (!agg[t]) agg[t] = { t, c: {}, s: 0 };
      agg[t].c[g] = (agg[t].c[g] || 0) + v;
      agg[t].s += v;
    });

    const rows = Object.values(agg).sort((a, b) => b.s - a.s);
    const cols = {};
    GT.forEach(g => { cols[g] = rows.reduce((s, r) => s + (r.c[g] || 0), 0); });
    return { rows, cols, total: rows.reduce((s, r) => s + r.s, 0) };
  }, [data, year, m, county, voyage, phase, div]);

  const hasFilters = county !== "all" || voyage !== "all" || phase !== "all";

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 mb-4">
        <select value={year} onChange={e => setYear(+e.target.value)} className="bg-transparent font-medium text-gray-900">
          {(f.years || []).map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={m} onChange={e => setM(e.target.value)} className="bg-transparent">
          {Object.entries(M).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <Select value={county} onChange={setCounty} options={f.counties || []} all="Alle fylker" />
        <select value={voyage} onChange={e => setVoyage(e.target.value)} className="bg-transparent text-gray-500">
          <option value="all">Alle reisetyper</option>
          {(f.voyage_types || []).map(v => <option key={v} value={v}>{VOYAGE[v] || v}</option>)}
        </select>
        <select value={phase} onChange={e => setPhase(e.target.value)} className="bg-transparent text-gray-500">
          <option value="all">Alle faser</option>
          {(f.phases || []).map(p => <option key={p} value={p}>{PHASE[p] || p}</option>)}
        </select>
        {hasFilters && <button onClick={() => { setCounty("all"); setVoyage("all"); setPhase("all"); }} className="text-gray-400 hover:text-gray-600">× Nullstill</button>}
      </div>

      {/* Total */}
      <p className="text-2xl tabular-nums mb-3">{n(total, 0)} <span className="text-sm text-gray-500">{unit} {label.toLowerCase()}</span></p>

      {/* Matrix - ultra compact */}
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-gray-400">
            <th className="text-left font-normal py-0.5 pr-2">Skipstype</th>
            {GTL.map((g, i) => <th key={i} className="text-right font-normal px-0.5 w-12">{g}</th>)}
            <th className="text-right font-normal pl-1 w-14">Sum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.t} className="border-t border-gray-50">
              <td className="py-0.5 pr-2 text-gray-600 truncate max-w-32">{r.t}</td>
              {GT.map((g, i) => <td key={i} className="text-right px-0.5 text-gray-400">{r.c[g] ? n(r.c[g], 0) : "·"}</td>)}
              <td className="text-right pl-1 text-gray-700">{n(r.s, 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 text-gray-600">
            <td className="py-0.5 pr-2">Sum</td>
            {GT.map((g, i) => <td key={i} className="text-right px-0.5">{n(cols[g], 0)}</td>)}
            <td className="text-right pl-1 font-medium text-gray-900">{n(total, 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ============================================
// NETTKAPASITET - Focus on what matters for shore power
// ============================================

function Nett({ data }) {
  const [q, setQ] = useState("");
  const [fylke, setFylke] = useState("all");
  const [kommune, setKommune] = useState("all");
  const [sort, setSort] = useState("ledig");
  const [dir, setDir] = useState("desc");

  const { rows, fylker, kommuner, stats } = useMemo(() => {
    if (!data?.grid_operators) return { rows: [], fylker: [], kommuner: [], stats: {} };

    const rows = Object.entries(data.grid_operators).flatMap(([id, o]) =>
      (o.locations || []).map(l => {
        const ledig = l.available_consumption || 0;
        const prod = l.available_production || 0;
        const overskudd = prod < 0 ? Math.abs(prod) : 0;
        return {
          name: l.name, kommune: l.kommune || "–", fylke: l.fylke || "–",
          nett: o.publisher || id.toUpperCase(),
          ledig, overskudd, reservert: l.reserved_consumption || 0
        };
      })
    );

    const stats = {
      n: rows.length,
      ledig: rows.reduce((s, r) => s + r.ledig, 0),
      medKapasitet: rows.filter(r => r.ledig >= 5).length,
      medOverskudd: rows.filter(r => r.overskudd > 0).length,
    };

    return {
      rows,
      fylker: [...new Set(rows.map(r => r.fylke).filter(f => f !== "–"))].sort(),
      kommuner: [...new Set(rows.map(r => r.kommune).filter(k => k !== "–"))].sort(),
      stats
    };
  }, [data]);

  const filtered = useMemo(() => {
    let f = rows;
    if (q) { const s = q.toLowerCase(); f = f.filter(r => r.name.toLowerCase().includes(s) || r.kommune.toLowerCase().includes(s) || r.nett.toLowerCase().includes(s)); }
    if (fylke !== "all") f = f.filter(r => r.fylke === fylke);
    if (kommune !== "all") f = f.filter(r => r.kommune === kommune);
    
    f = [...f].sort((a, b) => {
      const av = a[sort], bv = b[sort];
      if (typeof av === "number") return dir === "desc" ? bv - av : av - bv;
      return dir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
    return f;
  }, [rows, q, fylke, kommune, sort, dir]);

  const handleSort = (col) => {
    if (sort === col) setDir(d => d === "desc" ? "asc" : "desc");
    else { setSort(col); setDir("desc"); }
  };

  const Th = ({ col, children, left }) => (
    <th onClick={() => handleSort(col)} 
      className={`font-normal py-1.5 px-1 cursor-pointer hover:bg-gray-50 whitespace-nowrap ${sort === col ? "text-gray-900" : "text-gray-400"} ${left ? "text-left" : "text-right"}`}>
      {children}{sort === col && (dir === "desc" ? " ↓" : " ↑")}
    </th>
  );

  const fStats = useMemo(() => ({
    n: filtered.length,
    ledig: filtered.reduce((s, r) => s + r.ledig, 0),
  }), [filtered]);

  const isFiltered = q || fylke !== "all" || kommune !== "all";

  return (
    <div>
      {/* Summary */}
      <div className="flex gap-6 text-sm mb-4">
        <div><span className="text-2xl tabular-nums">{n(stats.n)}</span> <span className="text-gray-500">stasjoner</span></div>
        <div><span className="text-2xl tabular-nums text-emerald-700">{n(stats.ledig)}</span> <span className="text-gray-500">MW ledig</span></div>
      </div>

      {/* Filters - sentence style */}
      <p className="text-sm mb-3">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Søk stasjon..."
          className="border-b border-gray-300 focus:border-gray-500 outline-none w-40 mr-3" />
        <Select value={fylke} onChange={v => { setFylke(v); setKommune("all"); }} options={fylker} all="Alle fylker" />
        {" · "}
        <Select value={kommune} onChange={setKommune} 
          options={kommuner.filter(k => fylke === "all" || rows.some(r => r.kommune === k && r.fylke === fylke))} 
          all="Alle kommuner" />
        {isFiltered && <button onClick={() => { setQ(""); setFylke("all"); setKommune("all"); }} className="ml-2 text-gray-400 hover:text-gray-600">×</button>}
      </p>

      {/* Filtered result */}
      {isFiltered && (
        <p className="text-xs text-gray-500 mb-2">{fStats.n} stasjoner · {n(fStats.ledig)} MW ledig</p>
      )}

      {/* Table */}
      <table className="w-full text-sm">
        <thead className="text-xs">
          <tr className="border-b border-gray-200">
            <Th col="name" left>Stasjon</Th>
            <Th col="kommune" left>Kommune</Th>
            <Th col="fylke" left>Fylke</Th>
            <Th col="nett" left>Nettselskap</Th>
            <Th col="ledig">Ledig MW</Th>
            <Th col="overskudd">Overskudd MW</Th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {filtered.slice(0, 100).map((r, i) => (
            <tr key={i} className={i % 2 ? "bg-gray-50/50" : ""}>
              <td className="py-1 px-1 text-gray-800">{r.name}</td>
              <td className="py-1 px-1 text-gray-600">{r.kommune}</td>
              <td className="py-1 px-1 text-gray-500">{r.fylke}</td>
              <td className="py-1 px-1 text-gray-400">{r.nett}</td>
              <td className={`py-1 px-1 text-right ${r.ledig >= 10 ? "text-emerald-700 font-medium" : r.ledig >= 5 ? "text-emerald-600" : r.ledig > 0 ? "text-gray-600" : "text-gray-300"}`}>
                {r.ledig > 0 ? n(r.ledig, 1) : "–"}
              </td>
              <td className={`py-1 px-1 text-right ${r.overskudd > 0 ? "text-blue-600" : "text-gray-300"}`}>
                {r.overskudd > 0 ? n(r.overskudd, 0) : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length > 100 && <p className="text-xs text-gray-400 mt-2">Viser 100 av {filtered.length}. Bruk filtre for å begrense.</p>}

      {/* Compact legend */}
      <p className="text-xs text-gray-400 mt-4">
        <span className="text-emerald-600">Ledig</span> = kapasitet for nytt forbruk · 
        <span className="text-blue-600 ml-1">Overskudd</span> = overskuddsproduksjon i området (gunstig for forbruk)
      </p>
    </div>
  );
}

// ============================================
// APP
// ============================================

export default function App() {
  const [tab, setTab] = useState("skip");
  const [maru, setMaru] = useState(null);
  const [grid, setGrid] = useState(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/maru_data.json").then(r => r.json()), fetch("/grid_index.json").then(r => r.json())])
      .then(([m, g]) => { setMaru(m); setGrid(g); setOk(true); })
      .catch(() => setOk(true));
  }, []);

  if (!ok) return <p className="p-8 text-gray-400">Laster...</p>;

  return (
    <div className="max-w-5xl mx-auto px-5 py-6 text-gray-900">
      <header className="mb-5">
        <h1 className="text-base font-medium">Elektrisk Skipsfart</h1>
        <p className="text-sm text-gray-500">Skipsfart og nettkapasitet i Norge</p>
      </header>

      <nav className="flex gap-4 mb-5 text-sm">
        <button onClick={() => setTab("skip")} className={tab === "skip" ? "font-medium" : "text-gray-400"}>Skipsfart</button>
        <button onClick={() => setTab("nett")} className={tab === "nett" ? "font-medium" : "text-gray-400"}>Nettkapasitet</button>
      </nav>

      {tab === "skip" && maru && <Skipsfart data={maru} />}
      {tab === "nett" && grid && <Nett data={grid} />}

      <footer className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400">
        Data: <a href="https://www.wattapp.no/" className="hover:text-gray-600">WattApp</a> · <a href="https://www.kystverket.no/klima-og-barekraft/maru/" className="hover:text-gray-600">Kystverket MarU</a>
      </footer>
    </div>
  );
}
