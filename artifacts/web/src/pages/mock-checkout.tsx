import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { getAuthHeaders } from "@/lib/api-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, ShieldCheck, Lock, AlertCircle, RefreshCw } from "lucide-react";

export default function MockCheckoutPage() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();

  // Parse search params for tier
  const searchParams = new URLSearchParams(window.location.search);
  const tier = searchParams.get("tier") || "pro";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planName = tier === "pro" ? "Pro" : "Legend";
  const price = tier === "pro" ? 4.50 : 28.99;

  const handleCheckout = async (success: boolean) => {
    if (!success) {
      setLocation("/billing?status=cancel");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/mock-checkout-success", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process payment");
      }

      // Successful checkout, redirect back to billing with success status
      setLocation("/billing?status=success");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans antialiased text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/25 shadow-lg shadow-indigo-500/5 animate-pulse">
          <ShieldCheck className="h-8 w-8 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-slate-100 to-indigo-200 bg-clip-text text-transparent">
          Secure Payment Gateway
        </h2>
        <p className="text-sm text-slate-400">
          TubePulse Simulated Checkout Sandboxed Environment
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="bg-slate-900/80 backdrop-blur-md border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
          
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-xl text-slate-100 flex items-center justify-between">
              <span>Subscribe to TubePulse {planName}</span>
              <span className="text-2xl font-black text-indigo-400">${price}<span className="text-xs text-slate-400 font-normal">/mo</span></span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Instant access after authorization. Secure 256-bit SSL connection.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-950/50 border border-red-500/30 flex items-start gap-2 text-red-200 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="card-number" className="text-xs text-slate-300 font-medium">Card Number</Label>
                <div className="relative">
                  <Input
                    id="card-number"
                    defaultValue="4242 4242 4242 4242"
                    readOnly
                    className="bg-slate-950/60 border-slate-800 text-slate-100 focus-visible:ring-indigo-500 text-sm pl-10 h-10 select-all"
                  />
                  <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="expiry" className="text-xs text-slate-300 font-medium">Expires</Label>
                  <Input
                    id="expiry"
                    defaultValue="12 / 28"
                    readOnly
                    className="bg-slate-950/60 border-slate-800 text-slate-100 focus-visible:ring-indigo-500 text-sm h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cvc" className="text-xs text-slate-300 font-medium">CVC / CVV</Label>
                  <Input
                    id="cvc"
                    defaultValue="424"
                    readOnly
                    className="bg-slate-950/60 border-slate-800 text-slate-100 focus-visible:ring-indigo-500 text-sm h-10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cardholder" className="text-xs text-slate-300 font-medium">Cardholder Name</Label>
                <Input
                  id="cardholder"
                  defaultValue="Demo Creator"
                  readOnly
                  className="bg-slate-950/60 border-slate-800 text-slate-100 focus-visible:ring-indigo-500 text-sm h-10"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/40 text-[11px] text-indigo-200/80 leading-normal flex items-start gap-2">
              <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-400" />
              <span>
                This is a secure simulated transaction interface. No real money or card details will be processed.
              </span>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-2 pb-6">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all h-10 text-sm shadow-lg shadow-indigo-600/15"
              disabled={loading}
              onClick={() => handleCheckout(true)}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                "Authorize & Purchase"
              )}
            </Button>
            
            <Button
              variant="ghost"
              className="w-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 text-xs h-9 transition-colors"
              disabled={loading}
              onClick={() => handleCheckout(false)}
            >
              Decline & Cancel Transaction
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-6 flex justify-center items-center gap-1.5 text-[11px] text-slate-500">
          <Lock className="h-3 w-3" />
          <span>Secured by TubePulse Sandbox Gateway</span>
        </div>
      </div>
    </div>
  );
}
