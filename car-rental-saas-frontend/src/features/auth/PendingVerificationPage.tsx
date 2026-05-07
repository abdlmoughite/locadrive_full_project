import { Navigate } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/LoadingState";
import { useAuthStore } from "@/features/auth/authStore";
import { useAuthBootstrap, useLogout } from "@/features/auth/hooks";

export default function PendingVerificationPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const currentUserQuery = useAuthBootstrap();
  const logout = useLogout();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (currentUserQuery.isPending && !user) {
    return (
      <Card className="border-slate-200 bg-white/95 shadow-2xl shadow-blue-950/10">
        <CardContent className="p-8">
          <LoadingState title="Loading your account status..." />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "SUPERADMIN") {
    return <Navigate to="/admin/agencies" replace />;
  }

  if (user.role !== "AGENCY_OWNER" || user.is_verified) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Card className="overflow-hidden border-amber-200 bg-white/95 shadow-2xl shadow-amber-950/10">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          Verification required
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl">Account Pending Verification</CardTitle>
          <CardDescription>
            Your agency account is waiting for verification. Please contact support to activate your account.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Support phone</p>
          <p className="mt-1 text-lg font-bold tracking-wide">0665113076</p>
        </div>
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-950">Account:</span> {user.email}
          </p>
          <p>
            <span className="font-semibold text-slate-950">Verification:</span> {user.verification_status}
          </p>
          <p>
            <span className="font-semibold text-slate-950">Next step:</span> wait for support approval, then sign in again.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await logout();
          }}
        >
          Logout
        </Button>
      </CardContent>
    </Card>
  );
}
