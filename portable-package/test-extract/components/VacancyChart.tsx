"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const vacancyData: Array<{ month: string; loss: number }> = [];

export function VacancyChart() {
  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={vacancyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} />
          <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `${Number(v).toFixed(1)}%`} />
          <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
          <Bar dataKey="loss" fill="#0F172A" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
