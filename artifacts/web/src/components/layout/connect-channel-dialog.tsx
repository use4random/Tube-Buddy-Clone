import React, { useState, useEffect } from "react";
import { useConnectChannel } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Youtube, Loader2 } from "lucide-react";

interface ConnectChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newChannelId: number) => void;
}

export default function ConnectChannelDialog({
  open,
  onOpenChange,
  onSuccess,
}: ConnectChannelDialogProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("oauth");

  // Manual Form State
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [youtubeChannelId, setYoutubeChannelId] = useState("");
  const [subscribers, setSubscribers] = useState("1000");
  const [videos, setVideos] = useState("10");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const connectMutation = useConnectChannel({
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !youtubeChannelId.trim()) {
      toast({
        title: "Validation Error",
        description: "Channel Name and YouTube Channel ID are required.",
        variant: "destructive",
      });
      return;
    }

    connectMutation.mutate(
      {
        data: {
          name,
          youtubeChannelId,
          handle: handle.trim() || undefined,
          thumbnailUrl: thumbnailUrl.trim() || undefined,
          subscriberCount: parseInt(subscribers, 10) || 0,
          videoCount: parseInt(videos, 10) || 0,
        },
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Channel Connected!",
            description: `Successfully connected "${data.name}" manually.`,
          });
          onSuccess(data.id);
          resetForm();
        },
        onError: (err: any) => {
          toast({
            title: "Failed to connect",
            description: err?.message || "Something went wrong.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const resetForm = () => {
    setName("");
    setHandle("");
    setYoutubeChannelId("");
    setSubscribers("1000");
    setVideos("10");
    setThumbnailUrl("");
    setActiveTab("oauth");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (!v) resetForm();
    }}>
      <DialogContent className="sm:max-w-[480px] bg-white border border-gray-100 shadow-2xl p-0 overflow-hidden rounded-xl">
        <div className="p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
              <div className="bg-red-100 text-red-600 p-1.5 rounded-lg">
                <Youtube className="h-5 w-5" />
              </div>
              Connect YouTube Channel
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-xs mt-1">
              Link a YouTube channel to enable SEO suggestions, experiments, and retrieve daily performance analytics.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 bg-gray-100 p-1 rounded-lg mb-6">
              <TabsTrigger value="oauth" className="text-xs font-semibold py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                Google OAuth
              </TabsTrigger>
              <TabsTrigger value="manual" className="text-xs font-semibold py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm">
                Manual Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="oauth" className="space-y-4 outline-none">
              <div className="bg-red-50/20 border border-red-100/30 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-700 font-medium mb-3">
                  Connect your actual YouTube Channel securely using Google Authentication:
                </p>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!token) {
                      toast({
                        title: "Authentication Error",
                        description: "You must be logged in to connect a channel.",
                        variant: "destructive"
                      });
                      return;
                    }
                    try {
                      const res = await fetch(`/api/auth/google/url?token=${encodeURIComponent(token)}`);
                      if (!res.ok) throw new Error("Failed to get auth URL");
                      const data = await res.json();
                      window.location.assign(data.url);
                    } catch (e: any) {
                      toast({ title: "Error", description: e.message, variant: "destructive" });
                    }
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-10 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Youtube className="h-4 w-4" />
                  Sign up to connect YouTube channel
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="outline-none">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="chName" className="text-xs text-gray-700 font-medium">Channel Name *</Label>
                    <Input
                      id="chName"
                      placeholder="e.g. My Travel Vlogs"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-xs h-9 border-gray-200 focus:border-red-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chHandle" className="text-xs text-gray-700 font-medium">Handle</Label>
                    <Input
                      id="chHandle"
                      placeholder="e.g. @mytravels"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      className="text-xs h-9 border-gray-200 focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="chId" className="text-xs text-gray-700 font-medium">YouTube Channel ID *</Label>
                  <Input
                    id="chId"
                    placeholder="e.g. UC1234567890ABC"
                    value={youtubeChannelId}
                    onChange={(e) => setYoutubeChannelId(e.target.value)}
                    className="text-xs h-9 border-gray-200 focus:border-red-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="chSubs" className="text-xs text-gray-700 font-medium">Subscriber Count</Label>
                    <Input
                      id="chSubs"
                      type="number"
                      placeholder="12000"
                      value={subscribers}
                      onChange={(e) => setSubscribers(e.target.value)}
                      className="text-xs h-9 border-gray-200 focus:border-red-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chVideos" className="text-xs text-gray-700 font-medium">Video Count</Label>
                    <Input
                      id="chVideos"
                      type="number"
                      placeholder="35"
                      value={videos}
                      onChange={(e) => setVideos(e.target.value)}
                      className="text-xs h-9 border-gray-200 focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="chThumb" className="text-xs text-gray-700 font-medium">Thumbnail URL (Optional)</Label>
                  <Input
                    id="chThumb"
                    placeholder="https://example.com/avatar.jpg"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="text-xs h-9 border-gray-200 focus:border-red-500"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-10 mt-2"
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Connecting...
                    </>
                  ) : (
                    "Connect Channel"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
