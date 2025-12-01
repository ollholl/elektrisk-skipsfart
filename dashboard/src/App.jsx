import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";

// --- MarU Data Model ---
// Based on Kystverket's Maritime Emissions model
// Energy demand (MWh) by ship type and size category

const SIZE_CATEGORIES = [
  "0-399 GT",
  "400-999 GT",
  "1000-2999 GT",
  "3000-4999 GT",
  "5000-9999 GT",
  "10000-24999 GT",
  "25000-49999 GT",
  "50000-99999 GT",
];

// Data from MarU Power BI screenshot (2024, NOR flag, All filters)
const SHIP_TYPE_DATA = [
  {
    type: "Andre aktiviteter",
    data: { "0-399 GT": 40640, "400-999 GT": 2984, "1000-2999 GT": 35, "5000-9999 GT": 4761 },
    total: 48420,
  },
  {
    type: "Andre offshorefartøy",
    data: { "25000-49999 GT": 10 },
    total: 10,
  },
  {
    type: "Andre servicefartøy",
    data: { "0-399 GT": 184718, "400-999 GT": 48671, "1000-2999 GT": 12328, "3000-4999 GT": 27177, "5000-9999 GT": 13391 },
    total: 286284,
  },
  {
    type: "Container/RoRo",
    data: { "400-999 GT": 903, "3000-4999 GT": 1939, "5000-9999 GT": 11061 },
    total: 13903,
  },
  {
    type: "Cruise",
    data: { "0-399 GT": 892, "1000-2999 GT": 89, "10000-24999 GT": 181909 },
    total: 182890,
  },
  {
    type: "Fiskefartøy",
    data: { "0-399 GT": 136769, "400-999 GT": 89095, "1000-2999 GT": 229678, "3000-4999 GT": 154573 },
    total: 610112,
  },
  {
    type: "Gasstankskip",
    data: { "1000-2999 GT": 10242 },
    total: 10242,
  },
  {
    type: "Havbruk",
    data: { "0-399 GT": 11403, "400-999 GT": 12799, "1000-2999 GT": 84398, "3000-4999 GT": 104640, "5000-9999 GT": 36611 },
    total: 249850,
  },
  {
    type: "Kjemikalie-/produkttanker",
    data: { "0-399 GT": 1556, "400-999 GT": 14762, "1000-2999 GT": 8270, "3000-4999 GT": 11523 },
    total: 36110,
  },
  {
    type: "Offshore",
    data: { "0-399 GT": 10849, "400-999 GT": 2787, "1000-2999 GT": 3643, "3000-4999 GT": 318523, "5000-9999 GT": 279871, "10000-24999 GT": 23117 },
    total: 638790,
  },
  {
    type: "Oljetanker",
    data: { "0-399 GT": 488, "400-999 GT": 3083, "1000-2999 GT": 2894 },
    total: 6463,
  },
  {
    type: "Passasjer",
    data: { "0-399 GT": 144272, "400-999 GT": 129362, "1000-2999 GT": 472218, "3000-4999 GT": 74982, "5000-9999 GT": 366654, "10000-24999 GT": 241936, "25000-49999 GT": 547, "50000-99999 GT": 28 },
    total: 1429999,
  },
  {
    type: "Stykkgods",
    data: { "0-399 GT": 1598, "400-999 GT": 17520, "1000-2999 GT": 104588, "3000-4999 GT": 47687, "5000-9999 GT": 12404 },
    total: 183797,
  },
  {
    type: "Tørrbulk",
    data: { "400-999 GT": 496, "1000-2999 GT": 3657 },
    total: 4153,
  },
];

// Traffic types
const TRAFFIC_TYPES = [
  { id: "innenlands", label: "Innenlands", description: "Domestic traffic within Norway" },
  { id: "fra_utlandet", label: "Fra utlandet", description: "International arrivals" },
  { id: "til_utlandet", label: "Til utlandet", description: "International departures" },
  { id: "ved_kai", label: "Ved kai", description: "At berth/port" },
  { id: "ved_offshore", label: "Ved offshoreinst.", description: "At offshore installations" },
  { id: "gjennomfart", label: "Gjennomfart", description: "Transit traffic" },
];

// Filter options
const YEARS = [2024, 2023, 2022, 2021, 2020];
const MONTHS = ["Alle", "Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
const FLAGS = ["Alle", "NOR", "Utenlandsk"];
const OPERATION_PHASES = ["Alle", "Ved kai", "Manøvrering", "Cruise", "Ankring"];
const ESTIMATES = ["Totalt energibehov", "Drivstofforbruk", "CO2-utslipp", "NOx-utslipp"];

// Norwegian counties (Fylker)
const FYLKER = [
  "Alle",
  "Agder",
  "Innlandet",
  "Møre og Romsdal",
  "Nordland",
  "Oslo",
  "Rogaland",
  "Troms og Finnmark",
  "Trøndelag",
  "Vestfold og Telemark",
  "Vestland",
  "Viken",
];

// Helper functions
function nb(n, d = 0) {
  return n.toLocaleString("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: d });
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

// Custom tooltip
function EnergyTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#f0f4f8] border border-[#3b5998]/60 rounded-xl p-3 shadow-lg font-serif text-sm">
      <p className="font-semibold text-[#0f3460] mb-1">{label}</p>
      <p>Energibehov: <span className="font-semibold">{nb(payload[0].value)} MWh</span></p>
    </div>
  );
}

export default function MarUDashboard() {
  // Filter states
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedMonth, setSelectedMonth] = useState("Alle");
  const [selectedShipType, setSelectedShipType] = useState("Alle");
  const [selectedSize, setSelectedSize] = useState("Alle");
  const [selectedFlag, setSelectedFlag] = useState("NOR");
  const [selectedPhase, setSelectedPhase] = useState("Alle");
  const [selectedFylke, setSelectedFylke] = useState("Alle");
  const [selectedKommune, setSelectedKommune] = useState("Alle");
  const [selectedEstimate, setSelectedEstimate] = useState("Totalt energibehov");
  
  // Traffic type filter
  const [activeTrafficTypes, setActiveTrafficTypes] = useState(new Set(TRAFFIC_TYPES.map(t => t.id)));

  // Computed data
  const shipTypes = useMemo(() => {
    return ["Alle", ...SHIP_TYPE_DATA.map(d => d.type)];
  }, []);

  const filteredData = useMemo(() => {
    let data = SHIP_TYPE_DATA;
    
    // Filter by ship type if selected
    if (selectedShipType !== "Alle") {
      data = data.filter(d => d.type === selectedShipType);
    }
    
    return data;
  }, [selectedShipType]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalEnergy = filteredData.reduce((sum, d) => sum + d.total, 0);
    const bySize = {};
    
    SIZE_CATEGORIES.forEach(size => {
      bySize[size] = filteredData.reduce((sum, d) => sum + (d.data[size] || 0), 0);
    });
    
    return { totalEnergy, bySize };
  }, [filteredData]);

  // Data for charts
  const chartDataByType = useMemo(() => {
    return filteredData
      .map(d => ({ name: d.type, value: d.total }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const chartDataBySize = useMemo(() => {
    return SIZE_CATEGORIES.map(size => ({
      name: size,
      value: totals.bySize[size] || 0,
    })).filter(d => d.value > 0);
  }, [totals]);

  // Toggle traffic type
  function toggleTrafficType(id) {
    setActiveTrafficTypes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Colors for charts
  const COLORS = ["#0f3460", "#1a4d7c", "#2d6a9f", "#4a8ac2", "#6ba8d9", "#8fc5ec", "#b3daf5", "#d6edfb"];

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-[#1a1a2e] font-serif">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="relative pb-10 mb-8 border-b border-[#3b5998]/40">
          {/* Watermark */}
          <div className="pointer-events-none select-none absolute right-4 top-0 opacity-10 text-[5rem] leading-none text-[#0f3460]">
            MarU
          </div>
          <div className="flex items-center gap-4 mb-3">
            <p className="text-xs tracking-[0.25em] uppercase text-[#0f3460]">
              Kystverket · Maritime Utslipp (MarU)
            </p>
            <span className="text-xs text-[#0f3460]/60">v1.7.0</span>
          </div>
          <h1 className="text-4xl md:text-5xl text-[#0f3460] tracking-wide mb-3">
            Detaljer utslipp
          </h1>
          <h2 className="text-lg italic text-[#0f3460]/80 mb-6">
            Utslippsestimat skipsfarten
          </h2>
          <div className="mt-4 h-[3px] w-24 bg-[#e94560]" />
        </header>

        <main className="space-y-6">
          {/* Filters Section */}
          <section className="bg-[#e8eef4] border border-[#3b5998]/40 rounded-3xl p-4 sm:p-5 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
              {/* År */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#0f3460]/70 font-medium">År</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="border border-[#3b5998]/40 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]/30"
                >
                  {YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>

              {/* Måned */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#0f3460]/70 font-medium">Måned</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-[#3b5998]/40 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]/30"
                >
                  {MONTHS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>

              {/* Skipstype */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#0f3460]/70 font-medium">Skipstype</span>
                <select
                  value={selectedShipType}
                  onChange={(e) => setSelectedShipType(e.target.value)}
                  className="border border-[#3b5998]/40 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]/30"
                >
                  {shipTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              {/* Skipsstørrelse */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#0f3460]/70 font-medium">Skipsstørrelse</span>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="border border-[#3b5998]/40 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]/30"
                >
                  <option value="Alle">Alle</option>
                  {SIZE_CATEGORIES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              {/* Flagg */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#0f3460]/70 font-medium">Flagg</span>
                <select
                  value={selectedFlag}
                  onChange={(e) => setSelectedFlag(e.target.value)}
                  className="border border-[#3b5998]/40 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]/30"
                >
                  {FLAGS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>

              {/* Operasjonsfase */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#0f3460]/70 font-medium">Operasjonsfase</span>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="border border-[#3b5998]/40 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]/30"
                >
                  {OPERATION_PHASES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              {/* Forvaltningsplan */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#0f3460]/70 font-medium">Forvaltningsplan...</span>
                <select
                  className="border border-[#3b5998]/40 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]/30"
                  defaultValue="Alle"
                >
                  <option value="Alle">Alle</option>
                </select>
              </label>

              {/* Fylke */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#0f3460]/70 font-medium">Fylke</span>
                <select
                  value={selectedFylke}
                  onChange={(e) => setSelectedFylke(e.target.value)}
                  className="border border-[#3b5998]/40 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]/30"
                >
                  {FYLKER.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>

              {/* Kommune */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#0f3460]/70 font-medium">Kommune</span>
                <select
                  value={selectedKommune}
                  onChange={(e) => setSelectedKommune(e.target.value)}
                  className="border border-[#3b5998]/40 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]/30"
                >
                  <option value="Alle">Alle</option>
                </select>
              </label>

              {/* Estimat */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[#0f3460]/70 font-medium">Estimat</span>
                <select
                  value={selectedEstimate}
                  onChange={(e) => setSelectedEstimate(e.target.value)}
                  className="border border-[#3b5998]/40 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3460]/30"
                >
                  {ESTIMATES.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Total KPI */}
          <section className="bg-[#e94560] text-white rounded-3xl p-5 shadow-sm">
            <div className="text-center">
              <div className="text-sm uppercase tracking-wider opacity-80 mb-1">
                {selectedEstimate} (MWh)
              </div>
              <div className="text-4xl md:text-5xl font-bold">
                {nb(totals.totalEnergy)}
              </div>
            </div>
          </section>

          {/* Traffic Type Filters */}
          <section className="bg-[#e8eef4] border border-[#3b5998]/40 rounded-3xl p-4 shadow-sm">
            <div className="text-sm font-medium text-[#0f3460] mb-3">Filtrer på trafikktype</div>
            <div className="flex flex-wrap gap-2">
              {TRAFFIC_TYPES.map(traffic => (
                <button
                  key={traffic.id}
                  onClick={() => toggleTrafficType(traffic.id)}
                  className={classNames(
                    "px-4 py-2 rounded-xl text-sm font-medium transition border",
                    activeTrafficTypes.has(traffic.id)
                      ? "bg-[#0f3460] text-white border-[#0f3460]"
                      : "bg-white text-[#0f3460] border-[#3b5998]/40 hover:bg-[#d6e4f0]"
                  )}
                >
                  {traffic.label}
                </button>
              ))}
            </div>
          </section>

          {/* Data Table */}
          <section className="bg-[#e8eef4] border border-[#3b5998]/40 rounded-3xl p-4 sm:p-5 shadow-sm overflow-auto">
            <h3 className="text-lg text-[#0f3460] mb-4 tracking-wide">
              {selectedEstimate} (MWh)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b-2 border-[#0f3460] bg-[#0f3460] text-white">
                    <th className="py-3 px-2 text-left font-semibold">Skipstype</th>
                    {SIZE_CATEGORIES.map(size => (
                      <th key={size} className="py-3 px-2 text-right font-semibold whitespace-nowrap">
                        {size}
                      </th>
                    ))}
                    <th className="py-3 px-2 text-right font-semibold bg-[#e94560]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr 
                      key={row.type} 
                      className={classNames(
                        "border-b border-[#3b5998]/20",
                        idx % 2 === 0 ? "bg-white" : "bg-[#f5f8fb]"
                      )}
                    >
                      <td className="py-2 px-2 font-medium text-[#0f3460]">{row.type}</td>
                      {SIZE_CATEGORIES.map(size => (
                        <td key={size} className="py-2 px-2 text-right tabular-nums">
                          {row.data[size] ? nb(row.data[size]) : ""}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-right font-semibold text-[#e94560] bg-[#fef0f3] tabular-nums">
                        {nb(row.total)}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="border-t-2 border-[#0f3460] bg-[#0f3460] text-white font-semibold">
                    <td className="py-3 px-2">Total</td>
                    {SIZE_CATEGORIES.map(size => (
                      <td key={size} className="py-3 px-2 text-right tabular-nums">
                        {totals.bySize[size] ? nb(totals.bySize[size]) : ""}
                      </td>
                    ))}
                    <td className="py-3 px-2 text-right bg-[#e94560] tabular-nums">
                      {nb(totals.totalEnergy)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Ship Type */}
            <div className="bg-[#e8eef4] border border-[#3b5998]/40 rounded-3xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-lg text-[#0f3460] mb-1 tracking-wide">
                Energibehov per skipstype
              </h3>
              <p className="text-xs italic opacity-75 mb-3">
                {selectedEstimate} (MWh) fordelt på skipstype
              </p>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataByType} layout="vertical" margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3b5998" strokeOpacity={0.2} horizontal={false} vertical={true} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => nb(v)} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip content={<EnergyTooltip />} />
                    <Bar dataKey="value" name="Energibehov" fill="#0f3460" radius={[0, 4, 4, 0]}>
                      {chartDataByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By Size Category */}
            <div className="bg-[#e8eef4] border border-[#3b5998]/40 rounded-3xl p-4 sm:p-5 shadow-sm">
              <h3 className="text-lg text-[#0f3460] mb-1 tracking-wide">
                Energibehov per størrelse
              </h3>
              <p className="text-xs italic opacity-75 mb-3">
                {selectedEstimate} (MWh) fordelt på skipsstørrelse (GT)
              </p>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataBySize} margin={{ top: 10, right: 10, bottom: 40, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3b5998" strokeOpacity={0.2} horizontal={true} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, angle: -45, textAnchor: 'end' }} height={60} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => nb(v)} />
                    <Tooltip content={<EnergyTooltip />} />
                    <Bar dataKey="value" name="Energibehov" fill="#e94560" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Summary Section */}
          <section className="bg-[#e8eef4] border border-[#3b5998]/40 rounded-3xl p-4 sm:p-5 shadow-sm">
            <h3 className="text-lg text-[#0f3460] mb-4 tracking-wide">Oppsummering</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[#3b5998]/40 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.1em] text-[#0f3460]/70 mb-1">
                  Antall skipstyper
                </div>
                <div className="text-2xl text-[#0f3460] font-semibold">{filteredData.length}</div>
              </div>
              <div className="rounded-2xl border border-[#3b5998]/40 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.1em] text-[#0f3460]/70 mb-1">
                  Største bidragsyter
                </div>
                <div className="text-lg text-[#0f3460] font-semibold">
                  {chartDataByType[0]?.name || "-"}
                </div>
                <div className="text-xs text-[#0f3460]/60">
                  {chartDataByType[0] ? `${nb(chartDataByType[0].value)} MWh` : ""}
                </div>
              </div>
              <div className="rounded-2xl border border-[#3b5998]/40 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.1em] text-[#0f3460]/70 mb-1">
                  Største størrelseskategori
                </div>
                <div className="text-lg text-[#0f3460] font-semibold">
                  {chartDataBySize.sort((a, b) => b.value - a.value)[0]?.name || "-"}
                </div>
                <div className="text-xs text-[#0f3460]/60">
                  {chartDataBySize[0] ? `${nb(chartDataBySize.sort((a, b) => b.value - a.value)[0].value)} MWh` : ""}
                </div>
              </div>
              <div className="rounded-2xl border border-[#3b5998]/40 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.1em] text-[#0f3460]/70 mb-1">
                  Valgt år og flagg
                </div>
                <div className="text-lg text-[#0f3460] font-semibold">
                  {selectedYear} / {selectedFlag}
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="pt-4 mt-4 border-t border-[#3b5998]/40 text-[0.7rem] leading-relaxed text-[#0f3460]/80">
            <p>
              <span className="font-semibold">Kilde:</span> Kystverket, Maritime Utslipp (MarU) – 
              AIS-basert modell for estimering av utslipp fra skipstrafikk.
              {" "}
              <a 
                href="https://github.com/Kystverket/maru" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-[#0f3460]"
              >
                GitHub Repository →
              </a>
            </p>
            <p className="mt-2">
              <span className="font-semibold">Om MarU:</span> Maritime Emissions (MarU) er Kystverkets modell for AIS-basert 
              estimering av utslipp fra skipstrafikk. Modellen er basert på metodikk fra International Council of Clean Transport (ICCT) 
              og IMOs fjerde GHG-studie.
            </p>
            <p className="mt-2 text-[#0f3460]/60">
              Sist oppdatert: 05.11.2025 kl 07:01
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

