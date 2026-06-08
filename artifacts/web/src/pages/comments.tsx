import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useChannelContext } from "@/lib/channel";
import { useListComments, useReplyToComment, useListCannedResponses, useCreateCannedResponse } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, CheckCircle, Plus, Send, Bookmark } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function CommentsPage() {
  const { token } = useAuth();
  const { selectedChannelId } = useChannelContext();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<"all" | "unanswered" | "flagged">("unanswered");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [openCanned, setOpenCanned] = useState(false);
  const [cannedLabel, setCannedLabel] = useState("");
  const [cannedBody, setCannedBody] = useState("");
  const [cannedTags, setCannedTags] = useState("");

  const { data: comments, isLoading } = useListComments(
    { channelId: selectedChannelId!, filter },
    { query: { enabled: !!selectedChannelId } as any, request: { headers: getAuthHeaders(token) } }
  );

  const { data: cannedResponses } = useListCannedResponses(
    { channelId: selectedChannelId! },
    { query: { enabled: !!selectedChannelId } as any, request: { headers: getAuthHeaders(token) } }
  );

  const replyMutation = useReplyToComment({ request: { headers: getAuthHeaders(token) } });
  const createCannedMutation = useCreateCannedResponse({ request: { headers: getAuthHeaders(token) } });

  const handleReply = async (commentId: string) => {
    const text = replyText[commentId];
    if (!text?.trim()) return;
    await replyMutation.mutateAsync({ commentId: String(commentId), data: { text, channelId: selectedChannelId! } });
    setReplyText(p => ({ ...p, [commentId]: "" }));
    qc.invalidateQueries();
  };

  const handleCreateCanned = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCannedMutation.mutateAsync({ data: {
      channelId: selectedChannelId!,
      label: cannedLabel,
      body: cannedBody,
      tags: cannedTags.split(",").map(t => t.trim()).filter(Boolean),
    }});
    setOpenCanned(false);
    setCannedLabel(""); setCannedBody(""); setCannedTags("");
    qc.invalidateQueries();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comment Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Reply to comments and save canned responses</p>
        </div>

        {!selectedChannelId ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No channel selected</p>
          </div>
        ) : (
          <Tabs defaultValue="comments">
            <TabsList>
              <TabsTrigger value="comments"><MessageSquare className="h-4 w-4 mr-2" />Comments</TabsTrigger>
              <TabsTrigger value="canned"><Bookmark className="h-4 w-4 mr-2" />Canned Responses</TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="space-y-4">
              <div className="flex gap-2">
                {(["all", "unanswered", "flagged"] as const).map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    className={filter === f ? "bg-red-600 hover:bg-red-700" : ""}
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>

              {isLoading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>}

              {(comments ?? []).length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No {filter === "all" ? "" : filter} comments</p>
                </div>
              )}

              <div className="space-y-3">
                {(comments ?? []).map(comment => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.authorName}</span>
                            {comment.isReplied && <Badge className="text-[10px] py-0 px-1.5 bg-green-100 text-green-700">Replied</Badge>}
                            {comment.isFlagged && <Badge className="text-[10px] py-0 px-1.5 bg-red-100 text-red-700">Flagged</Badge>}
                          </div>
                          <p className="text-sm text-gray-700">{comment.text}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(comment.publishedAt!).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          👍 {comment.likeCount ?? 0}
                        </div>
                      </div>
                      {!comment.isReplied && (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Textarea
                              placeholder="Write a reply..."
                              value={replyText[String(comment.id)] ?? ""}
                              onChange={e => setReplyText(p => ({ ...p, [String(comment.id)]: e.target.value }))}
                              rows={2}
                              className="pr-20 text-sm"
                            />
                            {cannedResponses && cannedResponses.length > 0 && (
                              <select
                                className="absolute bottom-2 right-2 text-xs border rounded px-1 py-0.5 bg-white"
                                onChange={e => {
                                  const cr = cannedResponses.find(r => r.id === parseInt(e.target.value));
                                  if (cr) setReplyText(p => ({ ...p, [String(comment.id)]: cr.body }));
                                }}
                              >
                                <option value="">Quick reply</option>
                                {cannedResponses.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                              </select>
                            )}
                          </div>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 self-end"
                            onClick={() => handleReply(String(comment.id))}
                            disabled={replyMutation.isPending}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="canned" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={openCanned} onOpenChange={setOpenCanned}>
                  <DialogTrigger asChild>
                    <Button className="bg-red-600 hover:bg-red-700">
                      <Plus className="h-4 w-4 mr-2" />
                      New Response
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Canned Response</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCanned} className="space-y-4 mt-2">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input placeholder="Thank You" value={cannedLabel} onChange={e => setCannedLabel(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Response Text</Label>
                        <Textarea placeholder="Thanks so much for watching! 🙏" value={cannedBody} onChange={e => setCannedBody(e.target.value)} rows={4} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Tags <span className="text-gray-400 text-xs">(comma-separated, optional)</span></Label>
                        <Input placeholder="thanks, positive" value={cannedTags} onChange={e => setCannedTags(e.target.value)} />
                      </div>
                      <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">Save Response</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-3">
                {(cannedResponses ?? []).length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <Bookmark className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p>No canned responses yet</p>
                  </div>
                )}
                {(cannedResponses ?? []).map(r => (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{r.label}</p>
                          <p className="text-sm text-gray-600 mt-1">{r.body}</p>
                          <div className="flex gap-1 mt-2">
                            {(r.tags as string[]).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{r.useCount ?? 0} uses</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
