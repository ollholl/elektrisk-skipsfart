import { useMemo, useState, useEffect } from "react";

// --- Helpers ---
function nb(n, d = 0) {
  if (n === undefined || n === null || isNaN(n)) return "–";
  return n.toLocaleString("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ============================================
// MARU TAB COMPONENTS
// ============================================

const MEASURES = {
  sum_kwh: { label: "Energibehov", unit: "GWh", divisor: 1_000_000 },
  sum_kwh_shore_power: { label: "Landstrøm", unit: "GWh", divisor: 1_000_000 },
  sum_co2_tonnes: { label: "CO₂", unit: "kt", divisor: 1000 },
  sum_nox_tonnes: { label: "NOx", unit: "tonn", divisor: 1 },
  sum_sox_tonnes: { label: "SOx", unit: "tonn", divisor: 1 },
  sum_pm10_tonnes: { label: "PM10", unit: "tonn", divisor: 1 },
};

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

function MaruTab({ data }) {
  const [year, setYear] = useState(2024);
  const [voyageType, setVoyageType] = useState("all");
  const [phase, setPhase] = useState("all");
  const [county, setCounty] = useState("all");
  const [measure, setMeasure] = useState("sum_kwh");

  const filters = data?.filters || {};
  const years = filters.years || [];
  const voyageTypes = filters.voyage_types || [];
  const phases = filters.phases || [];
  const counties = filters.counties || [];
  const measureInfo = MEASURES[measure];

  const { tableData, sizeTotals, grandTotal } = useMemo(() => {
    if (!data?.data) return { tableData: [], sizeTotals: {}, grandTotal: 0 };

    let records = data.data.filter((d) => d.year === year);
    if (voyageType !== "all") records = records.filter((d) => d.voyage_type === voyageType);
    if (phase !== "all") records = records.filter((d) => d.phase === phase);
    if (county !== "all") records = records.filter((d) => d.county_name === county);

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
    const sizeTotals = {};
    GT_ORDER.forEach((g) => {
      sizeTotals[g] = tableData.reduce((s, r) => s + (r.sizes[g] || 0), 0);
    });
    const grandTotal = tableData.reduce((s, r) => s + r.total, 0);

    return { tableData, sizeTotals, grandTotal };
  }, [data, year, voyageType, phase, county, measure, measureInfo]);

  const activeFilters = [voyageType !== "all", phase !== "all", county !== "all"].filter(Boolean).length;

  return (
    <div>
      {/* Filters */}
      <section className="flex flex-wrap gap-3 mb-6 items-end text-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">År</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 bg-white">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Metrikk</label>
          <select value={measure} onChange={(e) => setMeasure(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 bg-white font-medium">
            {Object.entries(MEASURES).map(([k, v]) => (
              <option key={k} value={k}>{v.label} ({v.unit})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Trafikktype</label>
          <select value={voyageType} onChange={(e) => setVoyageType(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 bg-white">
            <option value="all">Alle</option>
            {voyageTypes.map((v) => <option key={v} value={v}>{VOYAGE_LABELS[v] || v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fase</label>
          <select value={phase} onChange={(e) => setPhase(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 bg-white">
            <option value="all">Alle</option>
            {phases.map((p) => <option key={p} value={p}>{PHASE_LABELS[p] || p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fylke</label>
          <select value={county} onChange={(e) => setCounty(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 bg-white">
            <option value="all">Alle</option>
            {counties.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {activeFilters > 0 && (
          <button onClick={() => { setVoyageType("all"); setPhase("all"); setCounty("all"); }}
            className="text-xs text-blue-600 hover:underline">Nullstill</button>
        )}
      </section>

      {/* Summary */}
      <div className="mb-4 text-sm text-gray-600">
        <span className="font-medium text-gray-900 text-lg">{nb(grandTotal, 1)}</span>{" "}
        <span>{measureInfo.unit} {measureInfo.label.toLowerCase()}</span>
        {activeFilters > 0 && <span className="text-gray-400"> (filtrert)</span>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2 pr-3 font-semibold text-gray-700">Skipstype</th>
              {GT_ORDER.map((g) => (
                <th key={g} className="text-right py-2 px-1 font-semibold text-gray-700 whitespace-nowrap">{GT_LABELS[g]}</th>
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
                <td className="py-1.5 pl-3 text-right tabular-nums font-medium text-gray-900">{nb(row.total, 1)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="py-2 pr-3 text-gray-900">Sum</td>
              {GT_ORDER.map((g) => (
                <td key={g} className="py-2 px-1 text-right tabular-nums text-gray-700">{sizeTotals[g] ? nb(sizeTotals[g], 1) : ""}</td>
              ))}
              <td className="py-2 pl-3 text-right tabular-nums text-gray-900">{nb(grandTotal, 1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ============================================
// GRID TAB COMPONENTS
// ============================================

function GridTab({ data }) {
  const [search, setSearch] = useState("");
  const [filterFylke, setFilterFylke] = useState("all");
  const [filterKommune, setFilterKommune] = useState("all");
  const [filterOperator, setFilterOperator] = useState("all");
  const [expandedOps, setExpandedOps] = useState(new Set());

  const { operators, allLocations, totals, kommuner, fylker } = useMemo(() => {
    if (!data?.grid_operators) return { operators: [], allLocations: [], totals: {}, kommuner: [], fylker: [] };

    const ops = Object.entries(data.grid_operators)
      .map(([id, op]) => ({
        id,
        name: op.publisher || id.toUpperCase(),
        count: op.feature_count,
        locations: (op.locations || []).sort((a, b) => (b.available_consumption || 0) - (a.available_consumption || 0)),
        totalCapacity: (op.locations || []).reduce((s, l) => s + (l.available_consumption || 0), 0),
        totalReserved: (op.locations || []).reduce((s, l) => s + (l.reserved_consumption || 0), 0),
      }))
      .sort((a, b) => b.totalCapacity - a.totalCapacity);

    const allLocations = ops.flatMap((op) =>
      op.locations.map((loc) => ({ ...loc, operator: op.name, operatorId: op.id }))
    );

    const kommuneSet = new Set(allLocations.map(l => l.kommune).filter(Boolean));
    const fylkeSet = new Set(allLocations.map(l => l.fylke).filter(Boolean));

    const totals = {
      locations: allLocations.length,
      operators: ops.length,
      totalCapacity: allLocations.reduce((s, l) => s + (l.available_consumption || 0), 0),
      totalReserved: allLocations.reduce((s, l) => s + (l.reserved_consumption || 0), 0),
    };

    return { 
      operators: ops, 
      allLocations, 
      totals, 
      kommuner: [...kommuneSet].sort(), 
      fylker: [...fylkeSet].sort() 
    };
  }, [data]);

  // Filter locations
  const filteredBySearch = useMemo(() => {
    if (!search && filterFylke === "all" && filterKommune === "all") return allLocations;
    
    let locs = allLocations;
    if (search) {
      const s = search.toLowerCase();
      locs = locs.filter((l) => 
        l.name?.toLowerCase().includes(s) || 
        l.operator?.toLowerCase().includes(s) || 
        l.kommune?.toLowerCase().includes(s)
      );
    }
    if (filterFylke !== "all") {
      locs = locs.filter((l) => l.fylke === filterFylke);
    }
    if (filterKommune !== "all") {
      locs = locs.filter((l) => l.kommune === filterKommune);
    }
    return locs;
  }, [allLocations, search, filterFylke, filterKommune]);

  // Group by operator
  const operatorsWithFiltered = useMemo(() => {
    return operators.map(op => {
      const locs = filteredBySearch.filter(l => l.operatorId === op.id);
      return { ...op, filteredLocations: locs, filteredCapacity: locs.reduce((s, l) => s + (l.available_consumption || 0), 0) };
    }).filter(op => filterOperator === "all" || op.id === filterOperator);
  }, [operators, filteredBySearch, filterOperator]);

  const toggleOp = (id) => {
    setExpandedOps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedOps(new Set(operators.map(o => o.id)));
  const collapseAll = () => setExpandedOps(new Set());

  const filteredTotal = filteredBySearch.reduce((s, l) => s + (l.available_consumption || 0), 0);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6 py-4 border-y border-gray-100">
        <div>
          <div className="text-2xl font-light tabular-nums">{nb(totals.locations)}</div>
          <div className="text-xs text-gray-500">Lokasjoner totalt</div>
        </div>
        <div>
          <div className="text-2xl font-light tabular-nums">{nb(totals.operators)}</div>
          <div className="text-xs text-gray-500">Nettselskaper</div>
        </div>
        <div>
          <div className="text-2xl font-light tabular-nums">{nb(totals.totalCapacity)}</div>
          <div className="text-xs text-gray-500">MW tilgjengelig totalt</div>
        </div>
        <div>
          <div className="text-2xl font-light tabular-nums">{nb(totals.totalReserved)}</div>
          <div className="text-xs text-gray-500">MW reservert totalt</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-end text-sm">
        <div className="flex-1 min-w-48">
          <label className="block text-xs text-gray-500 mb-1">Søk</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk stasjon, nettselskap, kommune..."
            className="w-full border border-gray-300 rounded px-3 py-1.5"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nettselskap</label>
          <select value={filterOperator} onChange={(e) => setFilterOperator(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 bg-white">
            <option value="all">Alle ({operators.length})</option>
            {operators.map((op) => <option key={op.id} value={op.id}>{op.name} ({op.count})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fylke</label>
          <select value={filterFylke} onChange={(e) => { setFilterFylke(e.target.value); setFilterKommune("all"); }}
            className="border border-gray-300 rounded px-2 py-1.5 bg-white">
            <option value="all">Alle fylker</option>
            {fylker.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Kommune</label>
          <select value={filterKommune} onChange={(e) => setFilterKommune(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 bg-white">
            <option value="all">Alle kommuner</option>
            {kommuner.filter(k => filterFylke === "all" || allLocations.some(l => l.kommune === k && l.fylke === filterFylke))
              .map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        {(filterFylke !== "all" || filterKommune !== "all" || filterOperator !== "all" || search) && (
          <button onClick={() => { setFilterFylke("all"); setFilterKommune("all"); setFilterOperator("all"); setSearch(""); }}
            className="text-xs text-blue-600 hover:underline">Nullstill</button>
        )}
      </div>

      {/* Filtered summary */}
      {(search || filterFylke !== "all" || filterKommune !== "all") && (
        <div className="mb-4 text-sm text-gray-600">
          Viser <span className="font-medium">{filteredBySearch.length}</span> lokasjoner med 
          <span className="font-medium"> {nb(filteredTotal)} MW</span> tilgjengelig kapasitet
        </div>
      )}

      {/* Expand/Collapse */}
      <div className="flex gap-2 mb-3 text-xs">
        <button onClick={expandAll} className="text-blue-600 hover:underline">Vis alle</button>
        <span className="text-gray-300">|</span>
        <button onClick={collapseAll} className="text-blue-600 hover:underline">Skjul alle</button>
      </div>

      {/* Operators with expandable lists */}
      <div className="space-y-2">
        {operatorsWithFiltered.filter(op => op.filteredLocations.length > 0).map((op) => (
          <div key={op.id} className="border border-gray-200 rounded">
            <button
              onClick={() => toggleOp(op.id)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{expandedOps.has(op.id) ? "▼" : "▶"}</span>
                <span className="font-medium text-sm">{op.name}</span>
                <span className="text-xs text-gray-500">({op.filteredLocations.length} stasjoner)</span>
              </div>
              <div className="text-sm tabular-nums">
                <span className={op.filteredCapacity > 50 ? "text-green-700 font-medium" : "text-gray-600"}>
                  {nb(op.filteredCapacity)} MW
                </span>
              </div>
            </button>
            
            {expandedOps.has(op.id) && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-1.5 px-3 font-medium text-gray-600">Stasjon</th>
                      <th className="text-left py-1.5 px-3 font-medium text-gray-600">Kommune</th>
                      <th className="text-right py-1.5 px-3 font-medium text-gray-600">Tilgj.</th>
                      <th className="text-right py-1.5 px-3 font-medium text-gray-600">Reserv.</th>
                      <th className="text-right py-1.5 px-3 font-medium text-gray-600">Prod.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op.filteredLocations.map((loc, i) => (
                      <tr key={`${loc.name}-${i}`} className={i % 2 ? "bg-gray-50" : "bg-white"}>
                        <td className="py-1 px-3 text-gray-800">{loc.name}</td>
                        <td className="py-1 px-3 text-gray-500">{loc.kommune || "–"}</td>
                        <td className={`py-1 px-3 text-right tabular-nums ${(loc.available_consumption || 0) > 10 ? "text-green-700 font-medium" : "text-gray-600"}`}>
                          {nb(loc.available_consumption || 0, 1)}
                        </td>
                        <td className="py-1 px-3 text-right tabular-nums text-gray-500">{nb(loc.reserved_consumption || 0, 1)}</td>
                        <td className="py-1 px-3 text-right tabular-nums text-gray-500">{nb(loc.available_production || 0, 1)}</td>
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
  const [maruData, setMaruData] = useState(null);
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/maru_data.json").then((r) => r.json()),
      fetch("/grid_index.json").then((r) => r.json()),
    ])
      .then(([maru, grid]) => {
        setMaruData(maru);
        setGridData(grid);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Laster data...</div>;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-xl font-medium text-gray-800">Elektrisk Skipsfart</h1>
          <p className="text-sm text-gray-500">Maritim energibehov og nettkapasitet i Norge</p>
        </header>

        {/* Tabs */}
        <nav className="flex gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setTab("maru")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "maru"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Skipsfart (MarU)
          </button>
          <button
            onClick={() => setTab("grid")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "grid"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Nettkapasitet
          </button>
        </nav>

        {/* Tab content */}
        {tab === "maru" && maruData && <MaruTab data={maruData} />}
        {tab === "grid" && gridData && <GridTab data={gridData} />}

        {/* Footer */}
        <footer className="text-xs text-gray-400 mt-8 pt-4 border-t border-gray-100">
          Kilder: <a href="https://github.com/Kystverket/maru" className="underline">Kystverket MarU</a> (skipsfart),{" "}
          <a href="https://wattapp.no" className="underline">WattApp/Elhub</a> (nettkapasitet)
        </footer>
      </div>
    </div>
  );
}
