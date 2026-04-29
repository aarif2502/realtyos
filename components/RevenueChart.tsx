"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const revenueTrend: Array<{ month: string; amount: number }> = [];

export function RevenueChart() {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67A6FF" stopOpacity={0.38} />
              <stop offset="100%" stopColor="#67A6FF" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" />
          <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#64748B" tickFormatter={(v) => `$${Number(v).toFixed(1)}M`} />
          <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}M`} />
          <Area type="monotone" dataKey="amount" stroke="#67A6FF" strokeWidth={3} fill="url(#revenueGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
