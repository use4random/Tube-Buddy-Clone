import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useChannelContext } from "@/lib/channel";
import { useListCompetitors, useAddCompetitor, useRemoveCompetitor } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Users, Eye, Video } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function CompetitorsPage() {
  const { token } = useAuth();
  const { selectedChannelId } = useChannelContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const [ycId, setYcId] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");

  const { data: competitors, isLoading } = useListCompetitors(
    { channelId: selectedChannelId! },
    { query: { enabled: !!selectedChannelId } as any, request: { headers: getAuthHeaders(token) } }
  );

  const addMutation = useAddCompetitor({ request: { headers: getAuthHeaders(token) } });
  const removeMutation = useRemoveCompetitor({ request: { headers: getAuthHeaders(token) } });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMutation.mutateAsync({ data: { channelId: selectedChannelId!, youtubeChannelId: ycId, name, handle } });
    qc.invalidateQueries();
    setOpen(false);
    setYcId(""); setName(""); setHandle("");
  };

  const handleRemove = async (competitorId: number) => {
    await removeMutation.mutateAsync({ competitorId });
    qc.invalidateQueries();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Competitors</h1>
            <p className="text-gray-500 text-sm mt-1">Track and compare competing channels</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700" disabled={!selectedChannelId}>
                <Plus className="h-4 w-4 mr-2" />
                Add Competitor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Competitor Channel</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>YouTube Channel ID</Label>
                  <Input placeholder="UCxxxxxx..." value={ycId} onChange={e => setYcId(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Channel Name</Label>
                  <Input placeholder="MKBHD" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Handle <span className="text-gray-400 text-xs">(optional)</span></Label>
                  <Input placeholder="@MKBHD" value={handle} onChange={e => setHandle(e.target.value)} />
                </div>
                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Adding..." : "Add Competitor"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!selectedChannelId && (
          <div className="text-center py-16 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No channel selected</p>
          </div>
        )}

        {isLoading && <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>}

        {competitors && competitors.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No competitors tracked yet</p>
            <p className="text-sm">Add competitor channels to benchmark your performance</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors?.map(c => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={c.thumbnailUrl ?? undefined} />
                    <AvatarFallback className="bg-gray-200 text-gray-600">{c.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    {c.handle && <p className="text-sm text-gray-500">{c.handle}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-red-600"
                    onClick={() => handleRemove(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Users className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                    <div className="text-sm font-semibold">{(c.subscriberCount ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Subs</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Eye className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                    <div className="text-sm font-semibold">{(c.averageViews ?? 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Avg Views</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <Video className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                    <div className="text-sm font-semibold">{c.uploadFrequency ?? "—"}/wk</div>
                    <div className="text-xs text-gray-500">Uploads</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
