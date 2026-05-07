import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DetailPanel } from "@/components/common/DetailPanel";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuthStore } from "@/features/auth/authStore";
import { formatDate, getRoleLabel } from "@/lib/formatters";
import { extractId } from "@/lib/utils";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your current account role, status, and assigned agency context." />
      <DetailPanel
        title="Account details"
        description="Current authenticated session and tenancy assignment."
        items={[
          { label: "Full name", value: user?.full_name ?? "-" },
          { label: "Email", value: user?.email ?? "-" },
          { label: "Role", value: user ? getRoleLabel(user.role) : "-" },
          { label: "Status", value: user ? <BadgeStatus status={user.status} /> : "-" },
          { label: "Verification", value: user?.verification_status ?? "VERIFIED" },
          { label: "Agency", value: extractId(user?.agency) || "Superadmin account" },
          { label: "Joined", value: formatDate(user?.date_joined) },
        ]}
      />
    </div>
  );
}
