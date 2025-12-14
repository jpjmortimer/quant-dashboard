import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketDashboard } from "@/components/features/market/MarketDashboard";

export default function DashboardPage() {
  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <MarketDashboard />
        </CardContent>
      </Card>
    </AppShell>
  );
}
