import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useGenerateTitles, useGenerateDescription, useGenerateTags, useGenerateVideoIdeas } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, CheckCircle2, Lightbulb, FileText, Hash, Wand2 } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="text-gray-400 hover:text-gray-700 transition-colors">
      {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

const demandColor: Record<string, string> = {
  very_high: "bg-green-100 text-green-700",
  high: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-600",
};

export default function AiToolsPage() {
  const { token } = useAuth();

  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [titleForDesc, setTitleForDesc] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [titleForTags, setTitleForTags] = useState("");
  const [descForTags, setDescForTags] = useState("");
  const [ideaNiche, setIdeaNiche] = useState("");

  const titlesMutation = useGenerateTitles({ request: { headers: getAuthHeaders(token) } });
  const descMutation = useGenerateDescription({ request: { headers: getAuthHeaders(token) } });
  const tagsMutation = useGenerateTags({ request: { headers: getAuthHeaders(token) } });
  const ideasMutation = useGenerateVideoIdeas({ request: { headers: getAuthHeaders(token) } });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            AI Tools
          </h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered content generation for faster creation</p>
        </div>

        <Tabs defaultValue="titles">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="titles"><Wand2 className="h-4 w-4 mr-1" />Titles</TabsTrigger>
            <TabsTrigger value="description"><FileText className="h-4 w-4 mr-1" />Desc</TabsTrigger>
            <TabsTrigger value="tags"><Hash className="h-4 w-4 mr-1" />Tags</TabsTrigger>
            <TabsTrigger value="ideas"><Lightbulb className="h-4 w-4 mr-1" />Ideas</TabsTrigger>
          </TabsList>

          <TabsContent value="titles" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Generate Titles</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Topic</Label>
                    <Input placeholder="YouTube growth tips" value={topic} onChange={e => setTopic(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Keyword <span className="text-gray-400 text-xs">(optional)</span></Label>
                    <Input placeholder="grow youtube channel" value={keyword} onChange={e => setKeyword(e.target.value)} />
                  </div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => titlesMutation.mutate({ data: { topic, keyword } })}
                    disabled={titlesMutation.isPending || !topic}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {titlesMutation.isPending ? "Generating..." : "Generate 10 Titles"}
                  </Button>
                </CardContent>
              </Card>
              <div className="space-y-2">
                {titlesMutation.data?.titles?.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 group">
                    <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}</span>
                    <p className="text-sm flex-1">{t.title}</p>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Badge className="text-xs bg-orange-100 text-orange-700">{t.seoScore}</Badge>
                      <CopyButton text={t.title} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="description" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Generate Description</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Video Title</Label>
                    <Input placeholder="How to Grow on YouTube" value={titleForDesc} onChange={e => setTitleForDesc(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Key Points <span className="text-gray-400 text-xs">(one per line)</span></Label>
                    <Textarea placeholder={"SEO tips\nAlgorithm secrets\nThumbnail design"} value={keyPoints} onChange={e => setKeyPoints(e.target.value)} rows={5} />
                  </div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => descMutation.mutate({ data: { title: titleForDesc, keyPoints: keyPoints.split("\n").filter(Boolean) } })}
                    disabled={descMutation.isPending || !titleForDesc}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {descMutation.isPending ? "Generating..." : "Generate Description"}
                  </Button>
                </CardContent>
              </Card>
              {descMutation.data?.description && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Generated Description</CardTitle>
                      <CopyButton text={descMutation.data.description} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700 max-h-[400px] overflow-y-auto">
                      {descMutation.data.description}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Generate Tags</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Video Title</Label>
                    <Input placeholder="How to Grow on YouTube" value={titleForTags} onChange={e => setTitleForTags(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description snippet</Label>
                    <Textarea placeholder="Brief description of your video..." value={descForTags} onChange={e => setDescForTags(e.target.value)} rows={3} />
                  </div>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => tagsMutation.mutate({ data: { title: titleForTags, description: descForTags } })}
                    disabled={tagsMutation.isPending || !titleForTags}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {tagsMutation.isPending ? "Generating..." : "Generate Tags"}
                  </Button>
                </CardContent>
              </Card>
              {tagsMutation.data?.tags && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{tagsMutation.data.tags.length} Tags Generated</CardTitle>
                      <CopyButton text={(tagsMutation.data.tags as string[]).join(", ")} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(tagsMutation.data.tags as string[]).map(tag => (
                        <Badge key={tag} variant="outline" className="text-sm">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ideas" className="mt-4">
            <div className="space-y-4">
              <div className="flex gap-2 max-w-xl">
                <Input placeholder="Your niche (optional) e.g. tech, fitness, cooking" value={ideaNiche} onChange={e => setIdeaNiche(e.target.value)} />
                <Button
                  className="bg-purple-600 hover:bg-purple-700 shrink-0"
                  onClick={() => ideasMutation.mutate({ data: { channelId: 0, count: 10 } })}
                  disabled={ideasMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {ideasMutation.isPending ? "Generating..." : "Generate Ideas"}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ideasMutation.data?.ideas?.map((idea, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-medium text-sm">{idea.title}</p>
                            <Badge className={`text-[10px] py-0 ${demandColor[idea.estimatedDemand ?? "medium"]}`}>
                              {(idea.estimatedDemand ?? "medium").replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{idea.description}</p>
                          <Badge variant="outline" className="text-xs">🔑 {idea.targetKeyword}</Badge>
                        </div>
                        <CopyButton text={idea.title} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
