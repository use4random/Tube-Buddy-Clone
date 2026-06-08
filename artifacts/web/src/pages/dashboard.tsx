import { useAuth } from "@/lib/auth";
import { useChannelContext } from "@/lib/channel";
import { useGetDashboardSummary, useGetChannelAnalytics } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Eye, Users, TrendingUp, FlaskConical, Search, Zap, DollarSign } from "lucide-react";

function StatCard({ title, value, change, icon: Icon, iconColor }: {
  title: string; value: string | number; change?: number; icon: React.ElementType; iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-500">{title}</span>
          <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</div>
        {change !== undefined && (
          <div className={`text-xs mt-1 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(1)}% this month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { selectedChannelId, selectedChannel } = useChannelContext();

  const { data: summary, isLoading: sumLoading } = useGetDashboardSummary(
    { channelId: selectedChannelId! },
    { query: { enabled: !!selectedChannelId } as any, request: { headers: getAuthHeaders(token) } }
  );

  const { data: analytics, isLoading: analyticsLoading } = useGetChannelAnalytics(
    { range: "30d", channelId: selectedChannelId! },
    { query: { enabled: !!selectedChannelId } as any, request: { headers: getAuthHeaders(token) } }
  );

  const loading = sumLoading || analyticsLoading;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })()}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {selectedChannel ? `${selectedChannel.name} — ${(selectedChannel.subscriberCount ?? 0).toLocaleString()} subscribers` : "Connect a channel to get started"}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />) : <>
            <StatCard title="Total Views" value={summary?.totalViews ?? 0} change={summary?.viewsGrowth} icon={Eye} iconColor="bg-blue-50 text-blue-600" />
            <StatCard title="Subscribers" value={summary?.totalSubscribers ?? 0} change={summary?.subscriberGrowth} icon={Users} iconColor="bg-green-50 text-green-600" />
            <StatCard title="SEO Score Avg" value={`${summary?.seoScoreAverage ?? 0}/100`} icon={TrendingUp} iconColor="bg-orange-50 text-orange-600" />
            <StatCard title="Est. Revenue" value={`$${summary?.estimatedMonthlyRevenue?.toFixed(2) ?? "0.00"}`} icon={DollarSign} iconColor="bg-purple-50 text-purple-600" />
            <StatCard title="Active Experiments" value={summary?.activeExperiments ?? 0} icon={FlaskConical} iconColor="bg-pink-50 text-pink-600" />
            <StatCard title="Keyword Searches" value={summary?.recentKeywordSearches ?? 0} icon={Search} iconColor="bg-yellow-50 text-yellow-600" />
            <StatCard title="Pending Bulk Jobs" value={summary?.pendingBulkJobs ?? 0} icon={Zap} iconColor="bg-indigo-50 text-indigo-600" />
            <StatCard title="Top Tag" value={summary?.topPerformingTag ?? "—"} icon={TrendingUp} iconColor="bg-teal-50 text-teal-600" />
          </>}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Views — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? <Skeleton className="h-52" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={analytics?.dailyMetrics ?? []}>
                  <defs>
                    <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} width={45} />
                  <Tooltip formatter={(v: number) => [v.toLocaleString(), "Views"]} />
                  <Area type="monotone" dataKey="views" stroke="#dc2626" fill="url(#viewGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {analytics?.topVideos && analytics.topVideos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Videos This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topVideos.map((v, i) => (
                  <div key={v.videoId} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      <p className="text-xs text-gray-500">{v.views.toLocaleString()} views · {v.ctr}% CTR</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{v.ctr}% CTR</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
