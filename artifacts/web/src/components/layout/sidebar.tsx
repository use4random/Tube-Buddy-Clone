import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useChannelContext } from "@/lib/channel";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Youtube, LayoutDashboard, Search, FileText, FlaskConical,
  Edit3, BarChart2, Users, MessageSquare, Sparkles, CreditCard,
  LogOut, ChevronRight, Download, Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Search, label: "Keywords", href: "/keywords" },
  { icon: FileText, label: "SEO Studio", href: "/seo" },
  { icon: FlaskConical, label: "A/B Testing", href: "/experiments", badge: "Pro" },
  { icon: Edit3, label: "Bulk Editor", href: "/bulk", badge: "Legend" },
  { icon: BarChart2, label: "Analytics", href: "/analytics" },
  { icon: Users, label: "Competitors", href: "/competitors" },
  { icon: MessageSquare, label: "Comments", href: "/comments" },
  { icon: Sparkles, label: "AI Tools", href: "/ai", badge: "Legend" },
  { icon: CreditCard, label: "Billing", href: "/billing" },
];

const tierColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  pro: "bg-blue-100 text-blue-700",
  legend: "bg-purple-100 text-purple-700",
  enterprise: "bg-orange-100 text-orange-700",
};

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { channels, selectedChannelId, setSelectedChannelId, setIsConnectOpen } = useChannelContext();
  const { toast } = useToast();

  return (
    <aside className="w-60 shrink-0 bg-gray-950 text-white flex flex-col h-full">
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 text-white rounded-lg p-1.5">
            <Youtube className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">TubePulse</span>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-gray-800">
        {channels.length > 0 ? (
          <div className="flex items-center gap-1.5">
            <Select
              value={selectedChannelId?.toString() ?? ""}
              onValueChange={v => setSelectedChannelId(parseInt(v))}
            >
              <SelectTrigger className="flex-1 bg-gray-900 border-gray-700 text-white text-sm h-9">
                <SelectValue placeholder="Select channel" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                {channels.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()} className="text-white focus:bg-gray-800">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-gray-900 border-gray-700 hover:bg-gray-800 hover:text-white text-gray-400 shrink-0"
              onClick={() => setIsConnectOpen(true)}
              title="Connect YouTube Channel"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full bg-gray-900 border-gray-700 hover:bg-gray-800 hover:text-white text-gray-400 text-xs h-9 justify-start gap-2"
            onClick={() => setIsConnectOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Connect Channel
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navItems.map(({ icon: Icon, label, href, badge }) => {
          const active = location === href || (href !== "/dashboard" && location.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                active
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {badge && !active && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-gray-600 text-gray-400">
                    {badge}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-indigo-600 border-indigo-700 hover:bg-indigo-700 text-white font-medium mb-3 justify-center text-xs flex items-center gap-2"
          onClick={() => {
            const link = document.createElement("a");
            link.href = "/extension.zip";
            link.download = "tubepulse-extension.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast({
              title: "Extension Downloaded!",
              description: "Instructions: 1. Extract 'tubepulse-extension.zip'. 2. Open chrome://extensions/ in Chrome. 3. Enable 'Developer mode'. 4. Click 'Load unpacked' and select the extracted folder.",
              duration: 12000,
            });
          }}
        >
          <Download className="h-3.5 w-3.5" />
          Get Chrome Extension
        </Button>
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-red-600 text-white text-xs">
              {user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <Badge className={cn("text-[10px] py-0 px-1.5 mt-0.5", tierColors[user?.tier ?? "free"])}>
              {user?.tier?.toUpperCase()}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-gray-400 hover:text-white hover:bg-gray-800 justify-start"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
