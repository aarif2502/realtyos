"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const monthlyIncomeData: Array<{ month: string; income: number }> = [];

export function IncomeChart() {
  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={monthlyIncomeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#67A6FF" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#67A6FF" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} />
          <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `$${Number(v).toFixed(1)}M`} />
          <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}M`} />
          <Area type="monotone" dataKey="income" stroke="#67A6FF" strokeWidth={3} fill="url(#incomeGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
