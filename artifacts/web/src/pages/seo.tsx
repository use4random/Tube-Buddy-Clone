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
import { AlertCircle, CheckCircle2, Info, Zap, TrendingUp, Sparkles, Plus, X } from "lucide-react";

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
  const [tagList, setTagList] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const scoreMutation = useScoreSeo({ request: { headers: getAuthHeaders(token) } });

  const handleAddTag = (newTag: string) => {
    if (!tagList.some(t => t.toLowerCase() === newTag.toLowerCase())) {
      setTagList([...tagList, newTag]);
    }
  };

  const handleRemoveTag = (idxToRemove: number) => {
    setTagList(tagList.filter((_, idx) => idx !== idxToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/,$/, "");
      if (val) {
        if (!tagList.some(t => t.toLowerCase() === val.toLowerCase())) {
          setTagList([...tagList, val]);
        }
        setTagInput("");
      }
    } else if (e.key === "Backspace" && !tagInput && tagList.length > 0) {
      setTagList(tagList.slice(0, -1));
    }
  };

  const handleScore = (e: React.FormEvent) => {
    e.preventDefault();
    scoreMutation.mutate({
      data: {
        title,
        description,
        tags: tagList,
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
                  <Label className="flex justify-between items-center">
                    <span>Tags <span className="text-gray-400 text-xs">({tagList.length} tags)</span></span>
                    {tagList.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => setTagList([])} 
                        className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline focus:outline-none"
                      >
                        Clear all
                      </button>
                    )}
                  </Label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md focus-within:ring-1 focus-within:ring-red-500 focus-within:border-red-500 min-h-[42px] transition-all">
                    {tagList.map((tag, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="flex items-center gap-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 pr-1 py-0.5 border-none"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(idx)}
                          className="hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full p-0.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 transition-colors focus:outline-none"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      type="text"
                      placeholder={tagList.length === 0 ? "Type tag and press Enter or comma..." : "Add tag..."}
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      className="flex-1 min-w-[120px] bg-transparent outline-none border-none text-sm p-0.5 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={scoreMutation.isPending || tagList.length === 0}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Overall Score */}
                  <Card className="overflow-hidden border-t-4 border-t-red-600 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>Overall Score</span>
                        <Badge variant="secondary" className="font-semibold text-[10px] bg-red-50 text-red-700 hover:bg-red-50">
                          Live Active
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className={`text-5xl font-extrabold text-center mb-3 tracking-tight ${scoreColor(result.overallScore)}`}>
                        {result.overallScore}<span className="text-xl font-normal text-gray-400">/100</span>
                      </div>
                      <div className="space-y-2.5 mt-4">
                        {[
                          { label: "Title", score: result.titleScore },
                          { label: "Description", score: result.descriptionScore },
                          { label: "Tags", score: result.tagsScore },
                        ].map(({ label, score }) => (
                          <div key={label} className="space-y-0.5">
                            <div className="flex justify-between text-[11px] font-medium">
                              <span className="text-gray-500">{label}</span>
                              <span className={`${scoreColor(score)}`}>{score}/100</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ease-out ${barColor(score)}`} style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Viewership Reach Potential Card */}
                  <Card className="border-t-4 border-t-violet-600 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75 flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                      <TrendingUp className="h-16 w-16 text-violet-600" />
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-violet-600" />
                        Reach Potential
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center flex-1 py-4">
                      <div className="text-4xl font-extrabold text-gray-900 tracking-tight mb-1">
                        {result.predictedMonthlyViews ? result.predictedMonthlyViews.toLocaleString() : "N/A"}
                      </div>
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-4">Est. Monthly Views</div>
                      <Badge className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                        result.viewershipIndex === "High Potential"
                          ? "bg-violet-50 text-violet-700 border-violet-200"
                          : result.viewershipIndex === "Good Potential"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}>
                        {result.viewershipIndex || "Moderate Potential"}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Detailed Recommendations */}
                  <Card className="shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100 flex flex-col h-[280px]">
                    <CardHeader className="pb-2 pt-3 px-4 flex-shrink-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-gray-700" />
                        Detailed Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto px-4 pb-3 pt-0">
                      {result.recommendations?.length === 0 ? (
                        <div className="flex items-center gap-2 text-green-600 h-full justify-center">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="text-sm font-medium">Your metadata looks great!</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {result.recommendations?.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50/85 dark:bg-gray-900 border border-gray-100/50 dark:border-gray-800">
                              {priorityIcon[rec.priority]}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-snug">{rec.message}</p>
                                <Badge variant="outline" className="text-[8px] mt-1 bg-white dark:bg-gray-800 uppercase font-bold tracking-wider px-1.5 py-0">{rec.priority} priority</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Live Trends and Autocomplete Suggestions Card */}
                  <Card className="shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150 flex flex-col h-[280px]">
                    <CardHeader className="pb-2 pt-3 px-4 flex-shrink-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Real-Time YouTube Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto px-4 pb-3 pt-0 space-y-3">
                      {/* Matched Trends */}
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Matched Trend Queries</h4>
                        {result.matchedTrends && result.matchedTrends.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {result.matchedTrends.map((t, idx) => (
                              <Badge key={idx} variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-900/50 text-[10px] px-2 py-0.5">
                                ✓ {t}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic">No exact trending YouTube searches matched in your tags. Add suggested tags below to boost search traffic!</p>
                        )}
                      </div>

                      {/* Trending Suggestions */}
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Trending Suggestions (Click to Add)</h4>
                        {result.trendingSuggestions && result.trendingSuggestions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {result.trendingSuggestions.map((t, idx) => {
                              const isAdded = tagList.some(val => val.toLowerCase() === t.toLowerCase());
                              return (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className={`text-[10px] px-2 py-0.5 cursor-pointer transition-all flex items-center gap-1 ${
                                    isAdded
                                      ? "bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-900 dark:text-gray-600 dark:border-gray-800 cursor-not-allowed"
                                      : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-950/40 active:scale-95"
                                  }`}
                                  onClick={() => !isAdded && handleAddTag(t)}
                                >
                                  {isAdded ? <CheckCircle2 className="h-2.5 w-2.5 text-green-500" /> : <Plus className="h-2.5 w-2.5" />}
                                  {t}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-400 italic">No trending autocomplete suggestions found for this keyword.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
