import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useScoreSeo } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Info, Zap } from "lucide-react";

const priorityIcon: Record<string, React.ReactNode> = {
  high: <AlertCircle className="h-4 w-4 text-red-500" />,
  medium: <Info className="h-4 w-4 text-yellow-500" />,
  low: <Info className="h-4 w-4 text-blue-400" />,
};

const scoreColor = (s: number) => s >= 70 ? "text-green-600" : s >= 45 ? "text-yellow-600" : "text-red-600";
const barColor = (s: number) => s >= 70 ? "bg-green-500" : s >= 45 ? "bg-yellow-500" : "bg-red-500";

export default function SeoPage() {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [keyword, setKeyword] = useState("");

  const scoreMutation = useScoreSeo({ request: { headers: getAuthHeaders(token) } });

  const handleScore = (e: React.FormEvent) => {
    e.preventDefault();
    scoreMutation.mutate({
      data: {
        title,
        description,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        targetKeyword: keyword || undefined,
      }
    });
  };

  const result = scoreMutation.data;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Studio</h1>
          <p className="text-gray-500 text-sm mt-1">Score and optimize your video metadata in real time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleScore} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Video Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Keyword (optional)</Label>
                  <Input placeholder="e.g. how to grow on youtube" value={keyword} onChange={e => setKeyword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Title <span className="text-gray-400 text-xs">({title.length}/70 chars)</span></Label>
                  <Input
                    placeholder="How to Grow Your YouTube Channel Fast in 2024"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description <span className="text-gray-400 text-xs">({description.length} chars)</span></Label>
                  <Textarea
                    placeholder="In this video I'll show you..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags <span className="text-gray-400 text-xs">(comma-separated)</span></Label>
                  <Input
                    placeholder="youtube tips, grow channel, tutorial"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={scoreMutation.isPending}>
                  <Zap className="h-4 w-4 mr-2" />
                  {scoreMutation.isPending ? "Analyzing..." : "Analyze SEO Score"}
                </Button>
              </CardContent>
            </Card>
          </form>

          <div className="space-y-4">
            {!result && !scoreMutation.isPending && (
              <div className="h-full flex items-center justify-center text-center text-gray-400 py-16">
                <div>
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Fill in your metadata and click Analyze</p>
                  <p className="text-sm">Get instant SEO recommendations</p>
                </div>
              </div>
            )}

            {result && (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Overall Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-5xl font-bold text-center mb-2 ${scoreColor(result.overallScore)}`}>
                      {result.overallScore}<span className="text-xl text-gray-400">/100</span>
                    </div>
                    <div className="space-y-3 mt-4">
                      {[
                        { label: "Title", score: result.titleScore },
                        { label: "Description", score: result.descriptionScore },
                        { label: "Tags", score: result.tagsScore },
                      ].map(({ label, score }) => (
                        <div key={label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{label}</span>
                            <span className={`font-medium ${scoreColor(score)}`}>{score}/100</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor(score)}`} style={{ width: `${score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.recommendations?.length === 0 ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-medium">Your metadata looks great!</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {result.recommendations?.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                            {priorityIcon[rec.priority]}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-700">{rec.message}</p>
                              <Badge variant="outline" className="text-[10px] mt-1">{rec.priority} priority</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
