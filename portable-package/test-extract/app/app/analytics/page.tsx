"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, BrainCircuit, Download, Filter } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionCard } from "@/components/SectionCard";

type CubeRow = { label: string; value: number };
type Insight = { title: string; detail: string; priority: "high" | "medium" | "low"; action: string };

const metricOptions = [
  ["occupancy", "Occupancy %"],
  ["arrears", "Arrears"],
  ["rent", "Weekly rent"],
  ["risk", "Risk records"],
  ["referrals", "Referrals"],
  ["support", "Support notes"],
  ["maintenance", "Maintenance"],
] as const;

const dimensionOptions = [
  ["property", "Property"],
  ["localAuthority", "Local authority"],
  ["risk", "Risk/severity"],
  ["status", "Status"],
  ["month", "Month"],
] as const;

export default function AnalyticsPage() {
  const [metric, setMetric] = useState("occupancy");
  const [dimension, setDimension] = useState("property");
  const [rows, setRows] = useState<CubeRow[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh(nextMetric = metric, nextDimension = dimension) {
    setLoading(true);
    const response = await fetch(`/api/reports/cube?metric=${nextMetric}&dimension=${nextDimension}`, { cache: "no-store" });
    const payload = await response.json();
    setRows(payload.rows || []);
    setInsights(payload.insights || []);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  const total = useMemo(() => rows.reduce((sum, row) => sum + Number(row.value || 0), 0), [rows]);

  function exportCsv() {
    const csv = ["Label,Value", ...rows.map((row) => `"${row.label.replace(/"/g, '""')}",${row.value}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${metric}-by-${dimension}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Cube Metric</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{metricOptions.find(([id]) => id === metric)?.[1]}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Dimension</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{dimensionOptions.find(([id]) => id === dimension)?.[1]}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total / Score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{Math.round(total)}</p>
        </article>
      </section>

      <SectionCard title="Custom Cube Report Builder" subtitle="Slice operational data by metric and dimension, similar to a lightweight data warehouse cube.">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <select className="ui-input" value={metric} onChange={(event) => { setMetric(event.target.value); void refresh(event.target.value, dimension); }}>
            {metricOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select className="ui-input" value={dimension} onChange={(event) => { setDimension(event.target.value); void refresh(metric, event.target.value); }}>
            {dimensionOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <button className="button-secondary gap-2" onClick={() => void refresh()}><Filter className="h-4 w-4" /> Run</button>
          <button className="button-secondary gap-2" onClick={exportCsv}><Download className="h-4 w-4" /> CSV</button>
        </div>
        <div className="mt-6 h-80 rounded-2xl border border-slate-200 bg-white p-4">
          {loading ? <p className="text-sm text-slate-600">Loading report...</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#172033" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Free AI Workflow Insights" subtitle="Autom8i-inspired rule-based insights generated from your own platform data. No paid external AI API required.">
        <div className="grid gap-3 lg:grid-cols-3">
          {insights.map((insight) => (
            <article key={insight.title} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <div className="flex items-start gap-3">
                <BrainCircuit className="mt-0.5 h-5 w-5 text-slate-600" />
                <div>
                  <p className="font-semibold text-slate-900">{insight.title}</p>
                  <p className="mt-1 text-slate-600">{insight.detail}</p>
                  <p className="mt-3 rounded-xl bg-slate-50 p-3 text-slate-700">{insight.action}</p>
                  <span className="mt-3 inline-flex rounded-full border border-slate-200 px-2 py-1 text-xs uppercase tracking-[0.12em] text-slate-500">{insight.priority}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Bespoke Report Rows" subtitle="Detailed rows behind the chart">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="pb-3">Label</th><th className="pb-3">Value</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr key={row.label}><td className="py-3 font-semibold text-slate-900">{row.label}</td><td className="py-3 text-slate-700">{Math.round(row.value * 100) / 100}</td></tr>)}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
