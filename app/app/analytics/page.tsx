"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Database, Download, FileText, Filter, Layers3, LineChart as LineChartIcon, RefreshCw, Table2 } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "@/components/SectionCard";

type BI = {
  role?: string;
  dashboards?: any;
  trends?: any;
  predictive?: any;
  drilldown?: any;
  external?: any;
  alerts?: Array<{ title: string; detail: string; action: string; priority: string }>;
};

type CubePayload = {
  metric: string;
  dimension: string;
  rows: Array<{ label: string; value: number; count?: number }>;
  insights?: Array<{ title: string; action: string; priority: string }>;
};

const metrics = [
  { id: "occupancy", label: "Occupancy", fact: "rooms", measure: "occupied room percentage", format: "percent" },
  { id: "arrears", label: "Arrears", fact: "rent ledger", measure: "outstanding debit minus credit", format: "money" },
  { id: "rent", label: "Rent", fact: "room rates", measure: "weekly rent roll", format: "money" },
  { id: "risk", label: "Risk", fact: "tenant records", measure: "risk-weighted tenant count", format: "number" },
  { id: "referrals", label: "Referrals", fact: "CRM referrals", measure: "referral count", format: "number" },
  { id: "support", label: "Support", fact: "support notes", measure: "support session count", format: "number" },
  { id: "maintenance", label: "Maintenance", fact: "maintenance jobs", measure: "open job count", format: "number" },
] as const;

const dimensions = [
  { id: "property", label: "Property", description: "Compare facts by property address." },
  { id: "localAuthority", label: "Local authority / region", description: "Group by council or operating area." },
  { id: "risk", label: "Risk level", description: "Group tenant and compliance data by risk." },
  { id: "status", label: "Status", description: "Group records by workflow state." },
  { id: "month", label: "Month", description: "Trend facts by calendar month." },
] as const;

const reportTemplates = [
  { title: "Council outcomes pack", metric: "support", dimension: "localAuthority", audience: "Councils", description: "Support sessions, risk reduction and active tenant counts." },
  { title: "Investor portfolio pack", metric: "rent", dimension: "property", audience: "Landlords / investors", description: "Revenue, occupancy, arrears and issue comparison by property." },
  { title: "Finance arrears pack", metric: "arrears", dimension: "property", audience: "Finance", description: "Outstanding balances by property with ageing and collection trends." },
  { title: "Compliance risk pack", metric: "risk", dimension: "risk", audience: "Managers", description: "High-risk tenants, incidents, reviews and support evidence." },
];

const chartTypes = ["bar", "line", "area", "donut", "table"] as const;

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatValue(value: number, format?: string) {
  if (format === "money") return money(value);
  if (format === "percent") return `${Math.round(value)}%`;
  return new Intl.NumberFormat("en-GB").format(Number(value || 0));
}

function csvDownload(name: string, rows: any[]) {
  const keys = Object.keys(rows[0] || { empty: "" });
  const csv = [keys.join(","), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const [data, setData] = useState<BI>({});
  const [cube, setCube] = useState<CubePayload>({ metric: "occupancy", dimension: "property", rows: [] });
  const [metric, setMetric] = useState("occupancy");
  const [dimension, setDimension] = useState("property");
  const [chart, setChart] = useState<(typeof chartTypes)[number]>("bar");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(reportTemplates[0]);

  const metricMeta = metrics.find((item) => item.id === metric) || metrics[0];
  const dimensionMeta = dimensions.find((item) => item.id === dimension) || dimensions[0];
  const drillRegions = data.drilldown?.regions || [];
  const selectedDrill = selectedRegion ? drillRegions.find((row: any) => row.region === selectedRegion) : drillRegions[0];
  const financeRows = data.dashboards?.finance?.monthly || [];
  const supportTrendRows = data.trends?.supportByMonth || [];
  const arrearsAging = data.dashboards?.finance?.arrearsAging || [];

  async function refreshBi() {
    const response = await fetch("/api/reports/bi", { cache: "no-store" });
    setData(await response.json());
  }

  async function refreshCube(nextMetric = metric, nextDimension = dimension) {
    const response = await fetch(`/api/reports/cube?metric=${encodeURIComponent(nextMetric)}&dimension=${encodeURIComponent(nextDimension)}`, { cache: "no-store" });
    setCube(await response.json());
  }

  useEffect(() => { void refreshBi(); }, []);
  useEffect(() => { void refreshCube(metric, dimension); }, [metric, dimension]);

  const topRows = useMemo(() => [...(cube.rows || [])].sort((a, b) => Number(b.value || 0) - Number(a.value || 0)).slice(0, 8), [cube.rows]);
  const palette = ["#0f766e", "#2563eb", "#f59e0b", "#e11d48", "#7c3aed", "#0891b2", "#65a30d", "#475569"];

  function applyTemplate(template: typeof reportTemplates[number]) {
    setSelectedTemplate(template);
    setMetric(template.metric);
    setDimension(template.dimension);
    setChart(template.metric === "arrears" ? "bar" : template.dimension === "month" ? "line" : "bar");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reports and BI analytics</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Multi-Dimensional Reporting Workspace</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">Build reports from labelled facts, measures and dimensions. Slice, drill down, export CSV, print monthly PDF packs and review exception alerts from the live database.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="button-secondary gap-2" onClick={() => { void refreshBi(); void refreshCube(); }}><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button className="button-secondary gap-2" onClick={() => window.print()}><FileText className="h-4 w-4" /> Print / PDF</button>
            <button className="button-primary gap-2" onClick={() => csvDownload(`${metric}-by-${dimension}`, cube.rows || [])}><Download className="h-4 w-4" /> Export CSV</button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-4">
        {reportTemplates.map((template) => (
          <button key={template.title} type="button" onClick={() => applyTemplate(template)} className={`rounded-2xl border p-4 text-left transition ${selectedTemplate.title === template.title ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">{template.audience}</p>
            <p className="mt-2 font-semibold">{template.title}</p>
            <p className="mt-2 text-sm opacity-75">{template.description}</p>
          </button>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <SectionCard title="Report Builder" subtitle="Select the fact, measure, dimension and chart type.">
          <div className="space-y-4">
            <label className="block">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Database className="h-4 w-4" /> Fact table / subject</span>
              <select className="ui-input mt-2" value={metric} onChange={(event) => setMetric(event.target.value)}>
                {metrics.map((item) => <option key={item.id} value={item.id}>{item.label} - {item.fact}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><BarChart3 className="h-4 w-4" /> Measure</span>
              <div className="mt-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{metricMeta.measure}</div>
            </label>
            <label className="block">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Layers3 className="h-4 w-4" /> Dimension</span>
              <select className="ui-input mt-2" value={dimension} onChange={(event) => setDimension(event.target.value)}>
                {dimensions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <span className="mt-2 block text-xs text-slate-500">{dimensionMeta.description}</span>
            </label>
            <div>
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><LineChartIcon className="h-4 w-4" /> Visualisation</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {chartTypes.map((type) => (
                  <button key={type} type="button" onClick={() => setChart(type)} className={chart === type ? "button-primary justify-center capitalize" : "button-secondary justify-center capitalize"}>{type}</button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title={`${metricMeta.label} by ${dimensionMeta.label}`} subtitle={`Fact: ${metricMeta.fact}. Measure: ${metricMeta.measure}. Dimension: ${dimensionMeta.description}`}>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Rows</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{cube.rows?.length ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total measure</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatValue((cube.rows || []).reduce((sum, row) => sum + Number(row.value || 0), 0), metricMeta.format)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Selected report</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedTemplate.title}</p>
            </div>
          </div>

          {chart === "table" ? (
            <div className="max-h-[440px] overflow-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr><th className="p-3">Dimension member</th><th className="p-3">Measure value</th><th className="p-3">Record count</th></tr>
                </thead>
                <tbody>
                  {(cube.rows || []).map((row) => (
                    <tr key={row.label} className="border-t border-slate-100">
                      <td className="p-3 font-medium text-slate-900">{row.label}</td>
                      <td className="p-3">{formatValue(row.value, metricMeta.format)}</td>
                      <td className="p-3">{row.count ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[460px] rounded-2xl border border-slate-200 bg-white p-4">
              <ResponsiveContainer width="100%" height="100%">
                {chart === "line" ? (
                  <LineChart data={cube.rows || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value) => formatValue(Number(value), metricMeta.format)} /><Line dataKey="value" stroke="#0f766e" strokeWidth={3} /></LineChart>
                ) : chart === "area" ? (
                  <AreaChart data={cube.rows || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value) => formatValue(Number(value), metricMeta.format)} /><Area dataKey="value" stroke="#2563eb" fill="#bfdbfe" /></AreaChart>
                ) : chart === "donut" ? (
                  <PieChart><Pie data={topRows} dataKey="value" nameKey="label" innerRadius={80} outerRadius={140}>{topRows.map((row, index) => <Cell key={row.label} fill={palette[index % palette.length]} />)}</Pie><Tooltip formatter={(value) => formatValue(Number(value), metricMeta.format)} /><Legend /></PieChart>
                ) : (
                  <BarChart data={cube.rows || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" hide={(cube.rows || []).length > 8} /><YAxis /><Tooltip formatter={(value) => formatValue(Number(value), metricMeta.format)} /><Bar dataKey="value" fill="#0f766e" /></BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard title="Time Analysis" subtitle="Monthly trends and arrears ageing for operational reporting packs.">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72 rounded-2xl border border-slate-200 bg-white p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financeRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Legend /><Area dataKey="due" fill="#cbd5e1" stroke="#334155" /><Area dataKey="collected" fill="#bbf7d0" stroke="#16a34a" /></AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72 rounded-2xl border border-slate-200 bg-white p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={arrearsAging}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip formatter={(value) => money(Number(value))} /><Bar dataKey="value" fill="#e11d48" /></BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72 rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={supportTrendRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Legend /><Line dataKey="sessions" stroke="#0ea5e9" strokeWidth={3} /><Line dataKey="improved" stroke="#22c55e" strokeWidth={3} /></LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Drilldown Explorer" subtitle="Region -> property -> tenant -> individual record context.">
          <label className="mb-4 block">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Filter className="h-4 w-4" /> Select region</span>
            <select className="ui-input mt-2" value={selectedRegion || selectedDrill?.region || ""} onChange={(event) => setSelectedRegion(event.target.value)}>
              {drillRegions.map((region: any) => <option key={region.region} value={region.region}>{region.region}</option>)}
            </select>
          </label>
          <div className="max-h-[660px] space-y-3 overflow-auto pr-2">
            {(selectedDrill?.properties || []).map((property: any) => (
              <details key={property.id} className="rounded-2xl border border-slate-200 bg-white p-4" open>
                <summary className="cursor-pointer font-semibold text-slate-900">{property.property} - {property.occupancyRate}% occupied - ROI {property.roi}%</summary>
                <div className="mt-3 space-y-2">
                  {property.tenants.length ? property.tenants.map((tenant: any) => (
                    <div key={tenant.id} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{tenant.tenant} - risk {tenant.riskLevel} - sessions {tenant.supportSessions} - arrears {money(tenant.arrears)}</div>
                  )) : <p className="text-sm text-slate-500">No tenants linked to this property.</p>}
                </div>
              </details>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Generated Report Pack" subtitle="Exportable summaries for councils, investors, finance and management.">
        <div className="grid gap-3 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">Council Outcome Summary</p>
            <p className="mt-2 text-sm text-slate-600">Active tenants: {data.external?.councilSummary?.activeTenants ?? 0}</p>
            <p className="text-sm text-slate-600">Support sessions: {data.external?.councilSummary?.supportSessions ?? 0}</p>
            <p className="text-sm text-slate-600">Outcome improvements: {data.external?.councilSummary?.outcomeImprovements ?? 0}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">Investor KPI Summary</p>
            <p className="mt-2 text-sm text-slate-600">Occupancy: {data.external?.investorSummary?.occupancyRate ?? 0}%</p>
            <p className="text-sm text-slate-600">Revenue: {money(data.external?.investorSummary?.revenue ?? 0)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">Current Query</p>
            <p className="mt-2 text-sm text-slate-600">Measure: {metricMeta.measure}</p>
            <p className="text-sm text-slate-600">Dimension: {dimensionMeta.label}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">Report Actions</p>
            <button className="button-secondary mt-3 w-full gap-2" onClick={() => csvDownload(`${metric}-by-${dimension}`, cube.rows || [])}><Table2 className="h-4 w-4" /> Download data</button>
          </article>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(data.alerts || []).slice(0, 4).map((alert) => (
            <article key={alert.title} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><p className="font-semibold text-slate-900">{alert.title}</p></div>
              <p className="mt-1 text-slate-600">{alert.action}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
