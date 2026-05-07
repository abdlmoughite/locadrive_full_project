import { useQuery } from "@tanstack/react-query";

import { BadgeStatus } from "@/components/common/BadgeStatus";
import { DetailPanel } from "@/components/common/DetailPanel";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { agenciesKeys, getMyAgency } from "@/features/agencies/api";
import { formatDate } from "@/lib/formatters";

export default function SettingsPage() {
  const agencyQuery = useQuery({
    queryKey: agenciesKeys.mine(),
    queryFn: getMyAgency,
  });

  if (agencyQuery.isPending) {
    return <LoadingState title="Loading agency settings..." />;
  }

  if (agencyQuery.isError || !agencyQuery.data) {
    return <ErrorState description="Agency settings are unavailable for this account." />;
  }

  const agency = agencyQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agency settings"
        description="Reference your tenant profile, contact details, and subscription status."
        actions={<BadgeStatus status={agency.subscription_status} />}
      />
      <DetailPanel
        title="Agency profile"
        description="This frontend respects multi-tenant isolation, so agency users never choose their agency manually."
        items={[
          { label: "Agency name", value: agency.name },
          { label: "Email", value: agency.email },
          { label: "Phone", value: agency.phone },
          { label: "Address", value: agency.address || "-" },
          { label: "Created", value: formatDate(agency.created_at) },
        ]}
      />
    </div>
  );
}
