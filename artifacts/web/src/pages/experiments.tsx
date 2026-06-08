import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useChannelContext } from "@/lib/channel";
import { useListExperiments, useCreateExperiment, useApplyExperimentWinner } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical, Plus, Trophy, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  complete: "bg-blue-100 text-blue-700",
};

export default function ExperimentsPage() {
  const { token } = useAuth();
  const { selectedChannelId } = useChannelContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const [videoId, setVideoId] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [type, setType] = useState<"title" | "thumbnail">("title");
  const [variantATitle, setVariantATitle] = useState("");
  const [variantBTitle, setVariantBTitle] = useState("");

  const { data: experiments, isLoading } = useListExperiments(
    { channelId: selectedChannelId! },
    { query: { enabled: !!selectedChannelId } as any, request: { headers: getAuthHeaders(token) } }
  );

  const createMutation = useCreateExperiment({ request: { headers: getAuthHeaders(token) } });
  const applyWinnerMutation = useApplyExperimentWinner({ request: { headers: getAuthHeaders(token) } });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      data: {
        channelId: selectedChannelId!,
        videoId,
        videoTitle,
        type,
        variantA: type === "title" ? { title: variantATitle } : { thumbnailUrl: variantATitle },
        variantB: type === "title" ? { title: variantBTitle } : { thumbnailUrl: variantBTitle },
      }
    });
    setOpen(false);
    setVideoId(""); setVideoTitle(""); setVariantATitle(""); setVariantBTitle("");
    qc.invalidateQueries();
  };

  const handleApplyWinner = async (experimentId: number) => {
    await applyWinnerMutation.mutateAsync({ experimentId });
    qc.invalidateQueries();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">A/B Testing</h1>
            <p className="text-gray-500 text-sm mt-1">Test thumbnails and titles to maximize CTR</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700" disabled={!selectedChannelId}>
                <Plus className="h-4 w-4 mr-2" />
                New Experiment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Experiment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Video ID</Label>
                  <Input placeholder="dQw4w9WgXcQ" value={videoId} onChange={e => setVideoId(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Video Title</Label>
                  <Input placeholder="How to Grow on YouTube" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Test Type</Label>
                  <Select value={type} onValueChange={v => setType(v as "title" | "thumbnail")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="thumbnail">Thumbnail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Variant A {type === "thumbnail" ? "(URL)" : ""}</Label>
                    <Input placeholder={type === "title" ? "Original title" : "https://..."} value={variantATitle} onChange={e => setVariantATitle(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Variant B {type === "thumbnail" ? "(URL)" : ""}</Label>
                    <Input placeholder={type === "title" ? "New title variant" : "https://..."} value={variantBTitle} onChange={e => setVariantBTitle(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Experiment"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!selectedChannelId && (
          <div className="text-center py-16 text-gray-400">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No channel selected</p>
          </div>
        )}

        {isLoading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>}

        {experiments && experiments.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No experiments yet</p>
            <p className="text-sm">Create your first A/B test to start optimizing CTR</p>
          </div>
        )}

        <div className="space-y-4">
          {experiments?.map(exp => (
            <Card key={exp.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs ${statusColor[exp.status]}`}>{exp.status}</Badge>
                      <Badge variant="outline" className="text-xs">{exp.type}</Badge>
                    </div>
                    <p className="font-medium text-gray-900 truncate">{exp.videoTitle ?? exp.videoId}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      Started {new Date(exp.startedAt!).toLocaleDateString()}
                    </div>
                    {exp.winnerVariant && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                        <Trophy className="h-3 w-3" />
                        Variant {exp.winnerVariant} won · {exp.confidenceLevel?.toFixed(1)}% confidence
                      </div>
                    )}
                  </div>
                  {exp.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyWinner(exp.id)}
                      disabled={applyWinnerMutation.isPending}
                    >
                      <Trophy className="h-4 w-4 mr-1" />
                      Apply Winner
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
