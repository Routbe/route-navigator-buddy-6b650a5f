import { createFileRoute } from "@tanstack/react-router";
import { OAuthConsole } from "@/components/dev/OAuthConsole";
import { ConsolePage } from "@/components/console/ConsolePage";

export const Route = createFileRoute("/_authenticated/console/apps/")({
  component: AppsOverview,
});

function AppsOverview() {
  return (
    <ConsolePage
      title="Je apps"
      description="Alle apps die 'Login met ROUT' gebruiken: sleutels, branding, redirects en scopes."
    >
      <OAuthConsole />
    </ConsolePage>
  );
}
