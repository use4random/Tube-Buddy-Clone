import React, { createContext, useContext, useEffect, useState } from "react";
import { useListChannels } from "@workspace/api-client-react";
import type { Channel } from "@workspace/api-client-react";
import { useAuth } from "./auth";

type ChannelContextType = {
  channels: Channel[];
  selectedChannelId: number | null;
  selectedChannel: Channel | null;
  setSelectedChannelId: (id: number | null) => void;
  isLoading: boolean;
};

const ChannelContext = createContext<ChannelContextType | null>(null);

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(() => {
    const saved = localStorage.getItem("selectedChannelId");
    return saved ? parseInt(saved, 10) : null;
  });

  const { data: channels = [], isLoading } = useListChannels({
    query: {
      enabled: !!user,
    } as any,
    request: {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  });

  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      const active = channels.find(c => c.isActive) || channels[0];
      setSelectedChannelId(active.id);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (selectedChannelId) {
      localStorage.setItem("selectedChannelId", selectedChannelId.toString());
    } else {
      localStorage.removeItem("selectedChannelId");
    }
  }, [selectedChannelId]);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) || null;

  return (
    <ChannelContext.Provider
      value={{
        channels,
        selectedChannelId,
        selectedChannel,
        setSelectedChannelId,
        isLoading,
      }}
    >
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannelContext() {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error("useChannelContext must be used within a ChannelProvider");
  }
  return context;
}
