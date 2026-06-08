import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useSearchKeywords } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";

const volColor: Record<string, string> = {
  very_high: "bg-green-100 text-green-700",
  high: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-orange-100 text-orange-700",
  very_low: "bg-red-100 text-red-700",
};

const scoreColor = (s: number) => s >= 70 ? "text-green-600" : s >= 45 ? "text-yellow-600" : "text-red-600";

export default function KeywordsPage() {
  const { token } = useAuth();
  const [location] = useLocation();
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [activeQuery, setActiveQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setQuery(q);
      setActiveQuery(q);
    }
  }, [location]);

  const { data, isLoading } = useSearchKeywords(
    { q: activeQuery },
    { query: { enabled: !!activeQuery } as any, request: { headers: getAuthHeaders(token) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setActiveQuery(query.trim());
  };

  const selectedKw = data?.keywords?.find(k => k.query === selectedKeyword) ?? data?.keywords?.[0];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keyword Research</h1>
          <p className="text-gray-500 text-sm mt-1">Discover what your audience is searching for</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <Input
            placeholder="Search any keyword..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={isLoading}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </form>

        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
            <Skeleton className="h-64" />
          </div>
        )}

        {!isLoading && data?.keywords && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-3">
              {data.keywords.map(kw => (
                <Card
                  key={kw.query}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedKeyword === kw.query || (!selectedKeyword && kw.query === data.keywords![0]?.query) ? "ring-2 ring-red-500" : ""}`}
                  onClick={() => setSelectedKeyword(kw.query)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{kw.query}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${volColor[kw.searchVolume ?? "medium"]}`}>
                            {(kw.searchVolume ?? "medium").replace("_", " ")} volume
                          </Badge>
                          <span className="text-xs text-gray-500">Competition: {kw.competitionScore}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${scoreColor(kw.overallScore ?? 0)}`}>
                          {kw.overallScore ?? 0}
                        </div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedKw && (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Trend — Last 30 Days</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={(selectedKw.trendData as number[] ?? []).map((v, i) => ({ day: i + 1, score: v }))}>
                        <XAxis dataKey="day" tick={false} />
                        <YAxis hide />
                        <Tooltip formatter={(v: number) => [v, "Interest"]} />
                        <Line type="monotone" dataKey="score" stroke="#dc2626" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Keyword Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Overall Score</span>
                      <span className={`font-bold ${scoreColor(selectedKw.overallScore ?? 0)}`}>{selectedKw.overallScore ?? 0}/100</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Search Volume</span>
                      <Badge className={`text-xs ${volColor[selectedKw.searchVolume ?? "medium"]}`}>
                        {(selectedKw.searchVolume ?? "medium").replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Competition</span>
                      <span className="font-medium">{selectedKw.competitionScore}%</span>
                    </div>
                  </CardContent>
                </Card>

                {(selectedKw.relatedKeywords as string[])?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Related Keywords</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {(selectedKw.relatedKeywords as string[]).map(r => (
                          <Badge
                            key={r}
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-red-50 hover:border-red-300"
                            onClick={() => { setQuery(r); setActiveQuery(r); }}
                          >
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {!isLoading && !data && (
          <div className="text-center py-16 text-gray-400">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Search for a keyword to get started</p>
            <p className="text-sm">Try "how to grow on youtube" or "tutorial"</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
