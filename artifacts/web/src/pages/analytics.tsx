import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useChannelContext } from "@/lib/channel";
import { useGetChannelAnalytics, useGetBestPublishTime } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart2, Eye, Clock, DollarSign } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RANGES = ["7d", "30d", "90d", "1y"] as const;
type Range = typeof RANGES[number];

function HeatmapCell({ score }: { score: number }) {
  const opacity = Math.max(0.05, score);
  return (
    <div
      className="rounded-sm aspect-square"
      style={{ backgroundColor: `rgba(220, 38, 38, ${opacity})` }}
      title={`Score: ${(score * 100).toFixed(0)}%`}
    />
  );
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const { selectedChannelId } = useChannelContext();
  const [range, setRange] = useState<Range>("30d");

  const { data: analytics, isLoading } = useGetChannelAnalytics(
    { range, channelId: selectedChannelId! },
    { query: { enabled: !!selectedChannelId } as any, request: { headers: getAuthHeaders(token) } }
  );

  const { data: bestTime } = useGetBestPublishTime(
    { channelId: selectedChannelId! },
    { query: { enabled: !!selectedChannelId } as any, request: { headers: getAuthHeaders(token) } }
  );

  const heatmapByDay: Record<number, number[]> = {};
  for (const cell of bestTime?.heatmap ?? []) {
    if (!heatmapByDay[cell.dayOfWeek]) heatmapByDay[cell.dayOfWeek] = [];
    heatmapByDay[cell.dayOfWeek][cell.hourOfDay] = cell.score;
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">Track performance across your channel</p>
          </div>
          <div className="flex gap-1">
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${range === r ? "bg-red-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {!selectedChannelId && (
          <div className="text-center py-16 text-gray-400">
            <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No channel selected</p>
          </div>
        )}

        {selectedChannelId && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />) : [
                { label: "Total Views", value: analytics?.views?.toLocaleString() ?? "—", icon: Eye, color: "bg-blue-50 text-blue-600" },
                { label: "Watch Hours", value: `${analytics?.watchTimeHours?.toFixed(0) ?? "—"}h`, icon: Clock, color: "bg-green-50 text-green-600" },
                { label: "Avg CTR", value: `${analytics?.averageCtr ?? "—"}%`, icon: BarChart2, color: "bg-orange-50 text-orange-600" },
                { label: "Est. Revenue", value: `$${analytics?.estimatedRevenue?.toFixed(2) ?? "0.00"}`, icon: DollarSign, color: "bg-purple-50 text-purple-600" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">{label}</span>
                      <div className={`p-1.5 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
                    </div>
                    <div className="text-xl font-bold">{value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily Views</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-48" /> : (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={analytics?.dailyMetrics ?? []}>
                        <defs>
                          <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fontSize: 10 }} width={40} />
                        <Tooltip />
                        <Area type="monotone" dataKey="views" stroke="#dc2626" fill="url(#vg)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily Subscribers</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? <Skeleton className="h-48" /> : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={analytics?.dailyMetrics ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fontSize: 10 }} width={40} />
                        <Tooltip />
                        <Bar dataKey="subscribers" radius={2}>
                          {(analytics?.dailyMetrics ?? []).map((d, i) => (
                            <Cell key={i} fill={d.subscribers >= 0 ? "#16a34a" : "#dc2626"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {bestTime && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Best Time to Publish</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-1 text-xs text-gray-400">
                        <div />
                        {Array.from({ length: 24 }, (_, h) => (
                          <div key={h} className="text-center">{h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`}</div>
                        ))}
                        {DAYS.map((day, d) => (
                          <React.Fragment key={d}>
                            <div className="text-right pr-2 flex items-center">{day}</div>
                            {Array.from({ length: 24 }, (_, h) => (
                              <HeatmapCell key={`${d}-${h}`} score={heatmapByDay[d]?.[h] ?? 0} />
                            ))}
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <div className="w-4 h-3 rounded bg-red-100" />Low
                        <div className="w-4 h-3 rounded bg-red-400 ml-2" />High engagement
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
