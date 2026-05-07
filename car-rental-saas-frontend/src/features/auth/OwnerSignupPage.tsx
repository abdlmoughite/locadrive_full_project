import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { applyServerValidationErrors } from "@/components/forms/form-utils";
import { LoadingState } from "@/components/common/LoadingState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/authStore";
import { useAuthBootstrap, useRegisterOwnerMutation } from "@/features/auth/hooks";
import { ownerSignupSchema } from "@/components/forms/schemas";
import { isPendingOwner } from "@/config/permissions";
import { getErrorMessage } from "@/lib/apiClient";

type OwnerSignupFormValues = z.infer<typeof ownerSignupSchema>;

export default function OwnerSignupPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const registerMutation = useRegisterOwnerMutation();
  const bootstrapQuery = useAuthBootstrap();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<OwnerSignupFormValues>({
    resolver: zodResolver(ownerSignupSchema) as never,
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      agency_name: "",
      agency_city: "",
      agency_address: "",
      password: "",
      confirm_password: "",
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

  if (accessToken && bootstrapQuery.isPending && !user) {
    return (
      <Card className="border-slate-200 bg-white/95 shadow-2xl shadow-blue-950/10">
        <CardContent className="p-8">
          <LoadingState title="Restoring your session..." />
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(values: OwnerSignupFormValues) {
    setServerError(null);
    try {
      await registerMutation.mutateAsync({
        full_name: `${values.first_name} ${values.last_name}`.trim(),
        email: values.email,
        password: values.password,
        confirm_password: values.confirm_password,
        agency_name: values.agency_name,
        agency_phone: values.phone,
        agency_address: values.agency_address || "",
        agency_city: values.agency_city || "",
      });
      toast.success("Registration submitted", {
        description: "Your agency account has been created and is now pending verification.",
      });
      navigate("/login", { replace: true });
    } catch (error) {
      applyServerValidationErrors(error, form.setError);
      setServerError(getErrorMessage(error));
      toast.error("Unable to create account", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Card className="overflow-hidden border-slate-200 bg-white/95 shadow-2xl shadow-blue-950/10">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
          Agency owner signup
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl">Create your agency account</CardTitle>
          <CardDescription>
            New agency owners start in pending verification status. Once approved, you will access the full dashboard.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="first_name">
              First name
            </label>
            <Input id="first_name" {...form.register("first_name")} />
            <p className="text-sm text-red-600">{form.formState.errors.first_name?.message}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="last_name">
              Last name
            </label>
            <Input id="last_name" {...form.register("last_name")} />
            <p className="text-sm text-red-600">{form.formState.errors.last_name?.message}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <Input id="email" type="email" {...form.register("email")} />
            <p className="text-sm text-red-600">{form.formState.errors.email?.message}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="phone">
              Agency phone
            </label>
            <Input id="phone" {...form.register("phone")} />
            <p className="text-sm text-red-600">{form.formState.errors.phone?.message}</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="agency_name">
              Agency name
            </label>
            <Input id="agency_name" {...form.register("agency_name")} />
            <p className="text-sm text-red-600">{form.formState.errors.agency_name?.message}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="agency_city">
              Agency city
            </label>
            <Input id="agency_city" {...form.register("agency_city")} />
            <p className="text-sm text-red-600">{form.formState.errors.agency_city?.message}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="agency_address">
              Agency address
            </label>
            <Input id="agency_address" {...form.register("agency_address")} />
            <p className="text-sm text-red-600">{form.formState.errors.agency_address?.message}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <Input id="password" type="password" {...form.register("password")} />
            <p className="text-sm text-red-600">{form.formState.errors.password?.message}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="confirm_password">
              Confirm password
            </label>
            <Input id="confirm_password" type="password" {...form.register("confirm_password")} />
            <p className="text-sm text-red-600">{form.formState.errors.confirm_password?.message}</p>
          </div>

          {serverError ? (
            <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          ) : null}

          <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating account..." : "Create account"}
            </Button>
            <Link to="/login">
              <Button type="button" variant="outline">
                Back to login
              </Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
