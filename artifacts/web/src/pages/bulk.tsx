import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useChannelContext } from "@/lib/channel";
import { useSubmitBulkUpdate, useSubmitBulkFindReplace, useListBulkJobs } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Edit3, Replace, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const statusIcon: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  running: <Loader2 className="h-3 w-3 animate-spin" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
};

export default function BulkPage() {
  const { token } = useAuth();
  const { selectedChannelId } = useChannelContext();
  const qc = useQueryClient();

  const [videoIds, setVideoIds] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [addTags, setAddTags] = useState("");

  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [scope, setScope] = useState<"title" | "description" | "tags">("title");
  const [isRegex, setIsRegex] = useState(false);

  const bulkUpdateMutation = useSubmitBulkUpdate({ request: { headers: getAuthHeaders(token) } });
  const findReplaceMutation = useSubmitBulkFindReplace({ request: { headers: getAuthHeaders(token) } });

  const { data: jobs, isLoading } = useListBulkJobs(
    { channelId: selectedChannelId! },
    { query: { enabled: !!selectedChannelId } as any, request: { headers: getAuthHeaders(token) } }
  );

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = videoIds.split("\n").map(s => s.trim()).filter(Boolean);
    const changes: Record<string, unknown> = {};
    if (newTitle) changes.title = newTitle;
    if (addTags) changes.tags = addTags.split(",").map(t => t.trim()).filter(Boolean);
    await bulkUpdateMutation.mutateAsync({ data: { channelId: selectedChannelId!, videoIds: ids, changes } });
    qc.invalidateQueries();
    setVideoIds(""); setNewTitle(""); setAddTags("");
  };

  const handleFindReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    await findReplaceMutation.mutateAsync({ data: { channelId: selectedChannelId!, search, replace, scope: [scope] as any, isRegex } });
    qc.invalidateQueries();
    setSearch(""); setReplace("");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Editor</h1>
          <p className="text-gray-500 text-sm mt-1">Edit dozens of videos at once</p>
        </div>

        {!selectedChannelId && (
          <div className="text-center py-16 text-gray-400">
            <Edit3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No channel selected</p>
          </div>
        )}

        {selectedChannelId && (
          <Tabs defaultValue="update">
            <TabsList>
              <TabsTrigger value="update"><Edit3 className="h-4 w-4 mr-2" />Bulk Update</TabsTrigger>
              <TabsTrigger value="replace"><Replace className="h-4 w-4 mr-2" />Find & Replace</TabsTrigger>
            </TabsList>

            <TabsContent value="update">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Update Multiple Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBulkUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Video IDs <span className="text-gray-400 text-xs">(one per line)</span></Label>
                      <Textarea
                        placeholder={"dQw4w9WgXcQ\nabc123xyz\nvideoId3"}
                        value={videoIds}
                        onChange={e => setVideoIds(e.target.value)}
                        rows={5}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>New Title <span className="text-gray-400 text-xs">(optional)</span></Label>
                      <Input placeholder="Leave blank to keep existing" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Add Tags <span className="text-gray-400 text-xs">(comma-separated, optional)</span></Label>
                      <Input placeholder="tutorial, how to, tips" value={addTags} onChange={e => setAddTags(e.target.value)} />
                    </div>
                    <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={bulkUpdateMutation.isPending}>
                      {bulkUpdateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : "Submit Bulk Update"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="replace">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Find & Replace Across Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleFindReplace} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Find</Label>
                        <Input placeholder="old text" value={search} onChange={e => setSearch(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Replace with</Label>
                        <Input placeholder="new text" value={replace} onChange={e => setReplace(e.target.value)} />
                      </div>
                    </div>
                    <div className="flex gap-6">
                      {(["title", "description", "tags"] as const).map(s => (
                        <label key={s} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value={s} checked={scope === s} onChange={() => setScope(s)} className="text-red-600" />
                          <span className="text-sm capitalize">{s}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={isRegex} onCheckedChange={setIsRegex} id="regex" />
                      <Label htmlFor="regex" className="cursor-pointer">Use regex</Label>
                    </div>
                    <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={findReplaceMutation.isPending}>
                      {findReplaceMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running...</> : "Run Find & Replace"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {selectedChannelId && (
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Job History</h2>
            {isLoading ? <Skeleton className="h-24" /> : (
              <div className="space-y-2">
                {(jobs ?? []).length === 0 && <p className="text-gray-400 text-sm text-center py-6">No jobs yet</p>}
                {(jobs ?? []).map(job => (
                  <Card key={job.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`text-xs flex items-center gap-1 ${statusColor[job.status]}`}>
                            {statusIcon[job.status]}
                            {job.status}
                          </Badge>
                          <span className="text-sm font-medium capitalize">{job.operationType.replace("_", " ")}</span>
                        </div>
                        <div className="text-sm text-gray-500 text-right">
                          <div>{job.processedVideos}/{job.totalVideos} videos</div>
                          <div className="text-xs">{new Date(job.createdAt!).toLocaleString()}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
