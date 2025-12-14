import { MarketLab } from "@/components/features/market/MarketLab";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LabPage() {
  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Lab</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <MarketLab />
        </CardContent>
      </Card>
    </AppShell>
  );
}
