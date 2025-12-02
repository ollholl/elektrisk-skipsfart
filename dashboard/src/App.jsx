import { useMemo, useState, useEffect, useRef } from "react";

const fmt = (v, d = 0) => v == null || isNaN(v) ? "–" : v.toLocaleString("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d });

function Select({ value, onChange, options, all = "Alle" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const filtered = options.filter(o => o.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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

const METRICS = { sum_kwh: ["Energi", "GWh", 1e6], sum_fuel_mdo_equivalent_tonnes: ["Drivstoff", "kt", 1e3], sum_co2_tonnes: ["CO₂", "kt", 1e3], sum_kwh_battery: ["Batteri", "GWh", 1e6] };
const GT = ["gt1, 0-399", "gt2, 400-999", "gt3, 1000-2999", "gt4, 3000-4999", "gt5, 5000-9999", "gt6, 10000-24999", "gt7, 25000-49999", "gt8, 50000-99999", "gt9, >=100 000"];
const GT_LABELS = ["<400", "4–1k", "1–3k", "3–5k", "5–10k", "10–25k", "25–50k", "50–100k", ">100k"];
const VOYAGE = { domestic: "Innenriks", international_in: "Fra utland", international_out: "Til utland", berthed: "Ved kai", transit: "Gjennomfart", ncs_facility_proximate: "Offshore" };

function Skipsfart({ data }) {
  const [year, setYear] = useState(2024);
  const [metric, setMetric] = useState("sum_kwh");
  const [county, setCounty] = useState("all");
  const [voyage, setVoyage] = useState("all");
  const filters = data?.filters || {};
  const [label, unit, divisor] = METRICS[metric];

  const { rows, cols, total } = useMemo(() => {
    if (!data?.data) return { rows: [], cols: {}, total: 0 };
    let filtered = data.data.filter(d => d.year === year);
    if (county !== "all") filtered = filtered.filter(d => d.county_name === county);
    if (voyage !== "all") filtered = filtered.filter(d => d.voyage_type === voyage);

    const byType = {};
    filtered.forEach(d => {
      const t = d.vessel_type, g = d.gt_group, v = (d[metric] || 0) / divisor;
      if (!byType[t]) byType[t] = { t, c: {}, s: 0 };
      byType[t].c[g] = (byType[t].c[g] || 0) + v;
      byType[t].s += v;
    });

    const rows = Object.values(byType).sort((a, b) => b.s - a.s);
    const cols = {};
    GT.forEach(g => { cols[g] = rows.reduce((s, r) => s + (r.c[g] || 0), 0); });
    return { rows, cols, total: rows.reduce((s, r) => s + r.s, 0) };
  }, [data, year, metric, county, voyage, divisor]);

  const hasFilters = county !== "all" || voyage !== "all";

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 mb-4">
        <select value={year} onChange={e => setYear(+e.target.value)} className="bg-transparent font-medium text-gray-900">
          {(filters.years || []).map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={metric} onChange={e => setMetric(e.target.value)} className="bg-transparent">
          {Object.entries(METRICS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <Select value={county} onChange={setCounty} options={filters.counties || []} all="Alle fylker" />
        <select value={voyage} onChange={e => setVoyage(e.target.value)} className="bg-transparent text-gray-500">
          <option value="all">Alle reisetyper</option>
          {(filters.voyage_types || []).map(v => <option key={v} value={v}>{VOYAGE[v] || v}</option>)}
        </select>
        {hasFilters && <button onClick={() => { setCounty("all"); setVoyage("all"); }} className="text-gray-400 hover:text-gray-600">× Nullstill</button>}
      </div>

      <p className="text-2xl tabular-nums mb-3">{fmt(total, 0)} <span className="text-sm text-gray-500">{unit} {label.toLowerCase()}</span></p>

      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-gray-400">
            <th className="text-left font-normal py-0.5 pr-2">Skipstype</th>
            {GT_LABELS.map((g, i) => <th key={i} className="text-right font-normal px-0.5 w-12">{g}</th>)}
            <th className="text-right font-normal pl-1 w-14">Sum</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.t} className="border-t border-gray-50">
              <td className="py-0.5 pr-2 text-gray-600 truncate max-w-32">{r.t}</td>
              {GT.map((g, i) => <td key={i} className="text-right px-0.5 text-gray-400">{r.c[g] ? fmt(r.c[g], 0) : "·"}</td>)}
              <td className="text-right pl-1 text-gray-700">{fmt(r.s, 0)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 text-gray-600">
            <td className="py-0.5 pr-2">Sum</td>
            {GT.map((g, i) => <td key={i} className="text-right px-0.5">{fmt(cols[g], 0)}</td>)}
            <td className="text-right pl-1 font-medium text-gray-900">{fmt(total, 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Nett({ data }) {
  const [q, setQ] = useState("");
  const [fylke, setFylke] = useState("all");
  const [kommune, setKommune] = useState("all");
  const [sort, setSort] = useState("forbruk");
  const [dir, setDir] = useState("desc");

  const { rows, fylker, kommuner, stats } = useMemo(() => {
    if (!data?.grid_operators) return { rows: [], fylker: [], kommuner: [], stats: { n: 0, forbruk: 0, prod: 0 } };

    const rows = Object.entries(data.grid_operators).flatMap(([id, o]) =>
      (o.locations || []).map(l => ({
        name: l.name,
        kommune: l.kommune || "–",
        fylke: l.fylke || "–",
        nett: o.publisher || id.toUpperCase(),
        forbruk: l.available_consumption || 0,
        prod: Math.abs(l.available_production || 0),
        reservert: l.reserved_consumption || 0,
      }))
    );

    return {
      rows,
      fylker: [...new Set(rows.map(r => r.fylke).filter(f => f !== "–"))].sort(),
      kommuner: [...new Set(rows.map(r => r.kommune).filter(k => k !== "–"))].sort(),
      stats: {
        n: rows.length,
        forbruk: rows.reduce((s, r) => s + r.forbruk, 0),
        prod: rows.reduce((s, r) => s + r.prod, 0),
      }
    };
  }, [data]);

  const filtered = useMemo(() => {
    let f = rows;
    if (q) {
      const search = q.toLowerCase();
      f = f.filter(r => r.name.toLowerCase().includes(search) || r.kommune.toLowerCase().includes(search) || r.nett.toLowerCase().includes(search));
    }
    if (fylke !== "all") f = f.filter(r => r.fylke === fylke);
    if (kommune !== "all") f = f.filter(r => r.kommune === kommune);

    return [...f].sort((a, b) => {
      const av = a[sort], bv = b[sort];
      if (typeof av === "number") return dir === "desc" ? bv - av : av - bv;
      return dir === "desc" ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [rows, q, fylke, kommune, sort, dir]);

  const handleSort = col => {
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
    forbruk: filtered.reduce((s, r) => s + r.forbruk, 0),
    prod: filtered.reduce((s, r) => s + r.prod, 0),
  }), [filtered]);

  const isFiltered = q || fylke !== "all" || kommune !== "all";

  const cell = (v, color) => v > 0 ? <span className={color}>{fmt(v, 1)}</span> : <span className="text-gray-300">–</span>;

  return (
    <div>
      <div className="flex gap-6 text-sm mb-4">
        <div><span className="text-2xl tabular-nums">{fmt(stats.n)}</span> <span className="text-gray-500">områder</span></div>
        <div><span className="text-2xl tabular-nums text-emerald-600">{fmt(stats.forbruk)}</span> <span className="text-gray-500">MW ledig forbruk</span></div>
        <div><span className="text-2xl tabular-nums text-sky-600">{fmt(stats.prod)}</span> <span className="text-gray-500">MW ledig produksjon</span></div>
      </div>

      <p className="text-sm mb-3">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Søk område..."
          className="border-b border-gray-300 focus:border-gray-500 outline-none w-40 mr-3" />
        <Select value={fylke} onChange={v => { setFylke(v); setKommune("all"); }} options={fylker} all="Alle fylker" />
        {" · "}
        <Select value={kommune} onChange={setKommune}
          options={kommuner.filter(k => fylke === "all" || rows.some(r => r.kommune === k && r.fylke === fylke))}
          all="Alle kommuner" />
        {isFiltered && <button onClick={() => { setQ(""); setFylke("all"); setKommune("all"); }} className="ml-2 text-gray-400 hover:text-gray-600">×</button>}
      </p>

      {isFiltered && <p className="text-xs text-gray-500 mb-2">{fStats.n} områder · {fmt(fStats.forbruk)} MW forbruk · {fmt(fStats.prod)} MW prod</p>}

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <Th col="name" left>Område</Th>
            <Th col="kommune" left>Kommune</Th>
            <Th col="nett" left>Nett</Th>
            <Th col="forbruk">Forbruk</Th>
            <Th col="prod">Prod</Th>
            <Th col="reservert">Res</Th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {filtered.slice(0, 100).map((r, i) => (
            <tr key={i} className={i % 2 ? "bg-gray-50/50" : ""}>
              <td className="py-1 px-1 text-gray-800">{r.name}</td>
              <td className="py-1 px-1 text-gray-600">{r.kommune}</td>
              <td className="py-1 px-1 text-gray-400">{r.nett}</td>
              <td className="py-1 px-1 text-right">{cell(r.forbruk, r.forbruk >= 10 ? "text-emerald-600 font-medium" : "text-emerald-600")}</td>
              <td className="py-1 px-1 text-right">{cell(r.prod, "text-sky-600")}</td>
              <td className="py-1 px-1 text-right">{cell(r.reservert, "text-gray-500")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length > 100 && <p className="text-xs text-gray-400 mt-2">Viser 100 av {filtered.length}. Bruk filtre.</p>}
      <p className="text-xs text-gray-400 mt-4">
        <span className="text-emerald-600">Forbruk</span> = ledig for nytt forbruk. <span className="text-sky-600">Prod</span> = ledig for ny produksjon. Alle tall i MW.
      </p>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("skip");
  const [maru, setMaru] = useState(null);
  const [grid, setGrid] = useState(null);

  useEffect(() => {
    fetch("/maru_data.json").then(r => r.json()).then(setMaru);
    fetch("/grid_index.json").then(r => r.json()).then(setGrid);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-5 py-6 text-gray-900">
      <header className="mb-5">
        <h1 className="text-base font-medium">Fra landstrøm til ladestrøm</h1>
        <p className="text-sm text-gray-500">Skipsfart og nettkapasitet i Norge</p>
      </header>

      <nav className="flex gap-4 mb-5 text-sm">
        <button onClick={() => setTab("skip")} className={tab === "skip" ? "font-medium" : "text-gray-400"}>Skipsfart</button>
        <button onClick={() => setTab("nett")} className={tab === "nett" ? "font-medium" : "text-gray-400"}>Nettkapasitet</button>
      </nav>

      {tab === "skip" && <Skipsfart data={maru} />}
      {tab === "nett" && <Nett data={grid} />}

      <footer className="mt-8 pt-4 border-t border-gray-100 text-xs text-gray-400">
        Data: <a href="https://www.kystverket.no/klima-og-barekraft/maru/" className="hover:text-gray-600">Kystverket MarU</a> · <a href="https://www.wattapp.no/" className="hover:text-gray-600">WattApp</a>
      </footer>
    </div>
  );
}
