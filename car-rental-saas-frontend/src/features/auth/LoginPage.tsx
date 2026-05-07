import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/common/LoadingState";
import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { loginSchema } from "@/components/forms/schemas";
import { authStore, useAuthStore } from "@/features/auth/authStore";
import { getCurrentUser } from "@/features/auth/api";
import { useAuthBootstrap, useLoginMutation } from "@/features/auth/hooks";
import { isPendingOwner } from "@/config/permissions";
import { getErrorMessage } from "@/lib/apiClient";
import type { LoginPayload } from "@/types/common";

export default function LoginPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const loginMutation = useLoginMutation();
  const bootstrapQuery = useAuthBootstrap();

  const form = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema) as never,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user?.role === "SUPERADMIN") {
      navigate("/admin/agencies", { replace: true });
    } else if (isPendingOwner(user)) {
      navigate("/pending-verification", { replace: true });
    } else if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user]);

  async function onSubmit(values: LoginPayload) {
    try {
      const tokens = await loginMutation.mutateAsync(values);
      const nextUser = tokens.user ?? (await getCurrentUser());
      authStore.setUser(nextUser);
      toast.success("Welcome back", {
        description: `Signed in as ${nextUser.full_name}.`,
      });
      navigate(
        nextUser.role === "SUPERADMIN"
          ? "/admin/agencies"
          : nextUser.role === "AGENCY_OWNER" && !nextUser.is_verified
            ? "/pending-verification"
            : "/dashboard",
        { replace: true },
      );
    } catch (error) {
      applyServerValidationErrors(error, form.setError);
      toast.error("Unable to sign in", {
        description: getErrorMessage(error),
      });
    }
  }

  if (accessToken && bootstrapQuery.isPending && !user) {
    return (
      <Card className="border-slate-200 bg-white/95 shadow-2xl shadow-blue-950/10">
        <CardContent className="p-8">
          <LoadingState title="Restoring your session..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-200 bg-white/95 shadow-2xl shadow-blue-950/10">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
          Agency access
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl">Sign in to the dashboard</CardTitle>
          <CardDescription>
            Use your agency or superadmin account. Clients do not log in to this platform.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <Input id="email" type="email" placeholder="name@agency.com" {...form.register("email")} />
            <p className="text-sm text-red-600">{form.formState.errors.email?.message}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <Input id="password" type="password" placeholder="Enter your password" {...form.register("password")} />
            <p className="text-sm text-red-600">{form.formState.errors.password?.message}</p>
          </div>

          <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Signing in..." : "Sign in"}
          </Button>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            New agency owner?{" "}
            <Link className="font-semibold text-blue-700 hover:text-blue-800" to="/register">
              Create your account
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
