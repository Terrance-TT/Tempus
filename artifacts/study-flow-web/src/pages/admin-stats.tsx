import { Loader2, Users, Repeat, Timer, CalendarCheck } from "lucide-react";
import { useGetAdminStatus, getGetAdminStatusQueryKey, useGetAdminStats, getGetAdminStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";

function StatCard({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4" />
          <span className="text-sm">{label}</span>
        </div>
        <p className="text-3xl font-heading font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminStats() {
  const { data: adminStatus, isLoading: isLoadingStatus } = useGetAdminStatus({
    query: { queryKey: getGetAdminStatusQueryKey() },
  });
  const isAdmin = adminStatus?.isAdmin === true;

  const { data: stats, isLoading } = useGetAdminStats({
    query: { enabled: isAdmin, queryKey: getGetAdminStatsQueryKey() },
  });

  if (isLoadingStatus) {
    return (
      <>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <div className="text-center py-20 space-y-2">
          <p className="text-xl font-heading font-semibold">Admins only</p>
          <p className="text-muted-foreground text-sm">This page is reserved for the Tempus team.</p>
        </div>
      </>
    );
  }

  const avgSeconds =
    stats?.averageGenerationTimeMs != null
      ? (stats.averageGenerationTimeMs / 1000).toFixed(1)
      : null;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Stats
          </h1>
          <p className="text-muted-foreground mt-1">
            High-level usage numbers across all Tempus users.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Total users"
              value={stats ? stats.totalUsers.toLocaleString() : "—"}
              testId="stat-total-users"
            />
            <StatCard
              icon={Repeat}
              label="Returning users"
              value={stats ? stats.returningUsers.toLocaleString() : "—"}
              testId="stat-returning-users"
            />
            <StatCard
              icon={CalendarCheck}
              label="Schedules generated"
              value={stats ? stats.totalSchedulesGenerated.toLocaleString() : "—"}
              testId="stat-schedules-generated"
            />
            <StatCard
              icon={Timer}
              label="Avg. generation time"
              value={avgSeconds != null ? `${avgSeconds}s` : "No data yet"}
              testId="stat-avg-generation-time"
            />
          </div>
        )}
      </div>
    </>
  );
}
