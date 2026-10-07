import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { RoutLogo } from "@/components/RoutLogo";

export const Route = createFileRoute("/_authenticated/console/apps")({
  head: () => ({
    meta: [
      { title: "Developer Console — Login met ROUT" },
      { name: "description", content: "Beheer je apps voor Login met ROUT: sleutels, branding, redirects, scopes en beveiliging." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Developer Console — Login met ROUT" },
      { property: "og:description", content: "Beheer je apps voor Login met ROUT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsoleLayout,
});

function ConsoleLayout() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-background/90 px-6 backdrop-blur">
        <Link to="/console/apps" className="flex items-center gap-3">
          <RoutLogo className="h-5 w-auto" />
          <span className="text-sm font-medium">Developer Console</span>
        </Link>
        <span className="text-xs text-muted-foreground">Login met ROUT</span>
        <Link to="/dashboard" className="ml-auto text-xs text-muted-foreground hover:text-foreground">
          Terug naar ROUT
        </Link>
      </header>
      <Outlet />
    </div>
  );
}
