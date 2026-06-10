import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useListBillingPlans, useGetSubscription } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Zap, Settings, RefreshCw, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const tierOrder = ["free", "pro", "legend", "enterprise"];

const tierStyle: Record<string, { badge: string; button: string; border: string; popular?: boolean }> = {
  free: { badge: "bg-slate-800 text-slate-300 border-slate-700", button: "bg-slate-800 hover:bg-slate-700 text-slate-200", border: "border-slate-800" },
  pro: { badge: "bg-blue-950 text-blue-300 border-blue-900/50", button: "bg-blue-600 hover:bg-blue-750 text-white shadow-lg shadow-blue-500/10", border: "border-blue-900/40" },
  legend: { badge: "bg-purple-950 text-purple-300 border-purple-900/50", button: "bg-purple-600 hover:bg-purple-750 text-white shadow-lg shadow-purple-500/10", border: "ring-2 ring-purple-600 border-purple-500/40", popular: true },
  enterprise: { badge: "bg-amber-950 text-amber-300 border-amber-900/50", button: "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/10", border: "border-amber-900/40" },
};

export default function BillingPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = useListBillingPlans();
  const { data: subscription } = useGetSubscription({
    query: { enabled: !!user } as any,
    request: { headers: getAuthHeaders(token) },
  });

  // Handle redirect callback status parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const status = searchParams.get("status");
    if (status === "success") {
      toast({
        title: "Subscription Activated! 🎉",
        description: "Your plan features have been unlocked instantly.",
      });
      // Force invalidate query caching to refresh active user state
      queryClient.invalidateQueries();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === "cancel") {
      toast({
        title: "Transaction Canceled",
        description: "Your checkout session was canceled.",
        variant: "destructive",
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast, queryClient]);

  const sortedPlans = [...(plans ?? [])].sort((a, b) =>
    tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );

  const currentTier = subscription?.tier ?? user?.tier ?? "free";
  const hasActiveSub = subscription && subscription.tier !== "free" && subscription.status === "active";

  const handleUpgrade = async (tier: string) => {
    setActionLoading(tier);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initiate checkout");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirection URL returned");
      }
    } catch (err: any) {
      toast({
        title: "Upgrade Failed",
        description: err.message || "Could not complete the request.",
        variant: "destructive",
      });
      setActionLoading(null);
    }
  };

  const handleManage = async () => {
    setActionLoading("manage");
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to open customer portal");
      }

      const data = await res.json();
      if (data.url && data.url !== "/billing") {
        window.location.href = data.url;
      } else {
        // Fallback or Mock mode: trigger direct cancel dialog since there is no Stripe session
        handleMockCancel();
      }
    } catch (err: any) {
      toast({
        title: "Management Failed",
        description: err.message || "Unable to open billing portal.",
        variant: "destructive",
      });
      setActionLoading(null);
    }
  };

  const handleMockCancel = async () => {
    if (!confirm("Are you sure you want to cancel your simulated subscription? You will be downgraded to the Free tier instantly.")) {
      setActionLoading(null);
      return;
    }

    setActionLoading("cancel");
    try {
      const res = await fetch("/api/billing/mock-cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to cancel subscription");
      }

      toast({
        title: "Subscription Canceled",
        description: "Downgraded to Free tier successfully.",
      });

      queryClient.invalidateQueries();
    } catch (err: any) {
      toast({
        title: "Cancellation Failed",
        description: err.message || "Failed to cancel your subscription.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8 max-w-6xl mx-auto font-sans text-slate-200">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-indigo-100 to-slate-100 bg-clip-text text-transparent">
            Scale Your YouTube Channel
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Choose the workspace plan that fits your production size. Cancel or switch plans at any time.
          </p>
        </div>

        {subscription && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3.5 px-5 py-2.5 bg-slate-900/60 backdrop-blur-md rounded-full border border-slate-800 shadow-md">
              <span className="text-xs text-slate-400 font-medium">Status:</span>
              <Badge variant="outline" className={`${tierStyle[currentTier]?.badge ?? ""} px-2.5 py-0.5 rounded-full text-[10px] font-bold border`}>
                {currentTier.toUpperCase()}
              </Badge>
              {hasActiveSub && (
                <>
                  <div className="h-3 w-px bg-slate-800" />
                  {subscription.currentPeriodEnd ? (
                    <span className="text-[11px] text-slate-500">
                      Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1">
                      Sandbox Active
                    </span>
                  )}
                  <div className="h-3 w-px bg-slate-800" />
                  <Button
                    onClick={handleManage}
                    disabled={actionLoading !== null}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-850 gap-1"
                  >
                    {actionLoading === "manage" || actionLoading === "cancel" ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Settings className="h-3 w-3" />
                    )}
                    Manage
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[420px] bg-slate-900 border border-slate-800/60 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedPlans.map(plan => {
              const style = tierStyle[plan.tier] ?? tierStyle.free;
              const isCurrent = plan.tier === currentTier;
              const isDowngrade = tierOrder.indexOf(plan.tier) < tierOrder.indexOf(currentTier);

              return (
                <Card key={plan.id} className={`relative bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden transition-all duration-300 hover:border-slate-700/80 ${style.border}`}>
                  {style.popular && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-purple-600 text-white shadow-md border-0 text-[10px] tracking-wide uppercase px-2.5 py-0.5 rounded-full font-bold">
                        Best Value
                      </Badge>
                    </div>
                  )}
                  
                  <div>
                    <CardHeader className="pb-4 pt-6 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-base font-extrabold text-slate-100">{plan.name}</span>
                        {isCurrent && (
                          <Badge className="text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-900/60 rounded-md">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="pt-1">
                        {plan.monthlyPrice === 0 && plan.tier === "enterprise" ? (
                          <div className="text-2xl font-black text-slate-100">Custom pricing</div>
                        ) : (
                          <div className="flex items-baseline">
                            <span className="text-3xl font-black text-slate-100">${plan.monthlyPrice}</span>
                            {plan.monthlyPrice > 0 && <span className="text-xs text-slate-400 font-medium ml-1">/mo</span>}
                          </div>
                        )}
                        {plan.annualPrice > 0 && (
                          <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                            ${plan.annualPrice}/mo billed annually
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-2 pb-6 space-y-4">
                      <div className="h-px bg-slate-800" />
                      <div className="space-y-2.5">
                        {(plan.features as string[]).map((f: string) => (
                          <div key={f} className="flex items-start gap-2.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-xs text-slate-300 leading-normal">{f}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </div>

                  <CardFooter className="pt-2 pb-6">
                    <Button
                      onClick={() => handleUpgrade(plan.tier)}
                      className={`w-full font-bold transition-all duration-300 h-9.5 text-xs rounded-lg ${style.button}`}
                      disabled={isCurrent || plan.tier === "enterprise" || actionLoading !== null}
                      size="sm"
                    >
                      {actionLoading === plan.tier ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {isCurrent 
                        ? "Current Plan" 
                        : plan.tier === "enterprise" 
                          ? "Contact Sales" 
                          : isDowngrade 
                            ? `Downgrade to ${plan.name}` 
                            : `Upgrade to ${plan.name}`}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex flex-col items-center justify-center space-y-1 pt-4 text-center">
          <p className="text-[11px] text-slate-500">
            All upgrade payments include a 7-day free trial period. Cancel any time with zero transaction fees.
          </p>
          <p className="text-[10px] text-slate-600 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Stripe Checkout Gateway integration enabled
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Dummy interface to prevent compilation warning
import { Lock } from "lucide-react";
