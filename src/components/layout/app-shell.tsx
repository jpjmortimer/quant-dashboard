import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold tracking-tight">
              Carbon Market
            </div>
            <Separator orientation="vertical" className="h-6" />
            <nav className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/lab">Lab</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/wiki">Wiki</Link>
              </Button>
            </nav>
          </div>

          <div className="text-xs text-muted-foreground">
            Binance dashboard + research platform
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
