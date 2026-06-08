import { useAuth } from "@/lib/auth";
import { useListBillingPlans, useGetSubscription } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Zap } from "lucide-react";

const tierOrder = ["free", "pro", "legend", "enterprise"];

const tierStyle: Record<string, { badge: string; button: string; border: string; popular?: boolean }> = {
  free: { badge: "bg-gray-100 text-gray-700", button: "bg-gray-900 hover:bg-gray-800", border: "" },
  pro: { badge: "bg-blue-100 text-blue-700", button: "bg-blue-600 hover:bg-blue-700", border: "" },
  legend: { badge: "bg-purple-100 text-purple-700", button: "bg-purple-600 hover:bg-purple-700", border: "ring-2 ring-purple-500", popular: true },
  enterprise: { badge: "bg-orange-100 text-orange-700", button: "bg-orange-500 hover:bg-orange-600", border: "" },
};

export default function BillingPage() {
  const { token, user } = useAuth();

  const { data: plans, isLoading: plansLoading } = useListBillingPlans();
  const { data: subscription } = useGetSubscription({
    query: { enabled: !!user } as any,
    request: { headers: getAuthHeaders(token) },
  });

  const sortedPlans = [...(plans ?? [])].sort((a, b) =>
    tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );

  const currentTier = subscription?.tier ?? user?.tier ?? "free";

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Choose Your Plan</h1>
          <p className="text-gray-500 text-sm mt-1">Unlock the tools you need to grow faster on YouTube</p>
        </div>

        {subscription && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-full border">
              <span className="text-sm text-gray-600">Current plan:</span>
              <Badge className={tierStyle[currentTier]?.badge ?? ""}>{currentTier.toUpperCase()}</Badge>
              {subscription.currentPeriodEnd && (
                <span className="text-xs text-gray-400">
                  Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-96" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedPlans.map(plan => {
              const style = tierStyle[plan.tier] ?? tierStyle.free;
              const isCurrent = plan.tier === currentTier;
              return (
                <Card key={plan.id} className={`relative ${style.border}`}>
                  {style.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-purple-600 text-white shadow-sm">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-3 pt-6">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {isCurrent && <Badge className="text-[10px] bg-green-100 text-green-700">Current</Badge>}
                    </div>
                    <div className="mt-1">
                      {plan.monthlyPrice === 0 && plan.tier === "enterprise" ? (
                        <div className="text-2xl font-bold">Custom</div>
                      ) : (
                        <>
                          <span className="text-3xl font-bold">${plan.monthlyPrice}</span>
                          {plan.monthlyPrice > 0 && <span className="text-sm text-gray-500">/mo</span>}
                          {plan.annualPrice > 0 && (
                            <div className="text-xs text-green-600 mt-0.5">${plan.annualPrice}/mo billed annually</div>
                          )}
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {(plan.features as string[]).map((f: string) => (
                        <div key={f} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-xs text-gray-600">{f}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className={`w-full text-white ${style.button}`}
                      disabled={isCurrent || plan.tier === "enterprise"}
                      size="sm"
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      {isCurrent ? "Current Plan" : plan.tier === "enterprise" ? "Contact Sales" : `Upgrade to ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-400">
          All plans include a 7-day free trial. Cancel anytime. No hidden fees.
        </p>
      </div>
    </DashboardLayout>
  );
}
