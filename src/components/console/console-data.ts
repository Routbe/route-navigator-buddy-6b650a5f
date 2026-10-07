import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOAuthClients, saveOAuthClient } from "@/lib/oauth/console.functions";

export type ConsoleApp = {
  id: string;
  clientId: string;
  name: string;
  logoUrl: string | null;
  homepageUrl: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  redirectUris: string[];
  scopes: string[];
  status: string;
  hasSecret: boolean;
  createdAt: string;
  flowPreference: "seamless" | "strict";
  richIdentityEnabled: boolean;
};

export type AppPatch = Partial<
  Pick<
    ConsoleApp,
    | "name"
    | "logoUrl"
    | "homepageUrl"
    | "privacyUrl"
    | "termsUrl"
    | "redirectUris"
    | "scopes"
    | "flowPreference"
    | "richIdentityEnabled"
  >
>;

export const APPS_KEY = ["console", "oauth-apps"] as const;

export function useConsoleApps() {
  const list = useServerFn(listOAuthClients);
  return useQuery(
    queryOptions({
      queryKey: APPS_KEY,
      queryFn: async () => (await list()) as ConsoleApp[],
      retry: false,
    }),
  );
}

export function useConsoleApp(appId: string) {
  const q = useConsoleApps();
  return { ...q, app: q.data?.find((a) => a.id === appId) ?? null };
}

/** Saves a partial change by merging it with the current app (backend needs the full record). */
export function useSaveApp() {
  const save = useServerFn(saveOAuthClient);
  const qc = useQueryClient();
  return async (app: ConsoleApp, patch: AppPatch) => {
    const next = { ...app, ...patch };
    const result = await save({
      data: {
        id: app.id,
        name: next.name,
        logoUrl: next.logoUrl,
        homepageUrl: next.homepageUrl,
        privacyUrl: next.privacyUrl,
        termsUrl: next.termsUrl,
        redirectUris: next.redirectUris,
        scopes: next.scopes as ("openid" | "profile" | "email" | "linked_accounts")[],
        flowPreference: next.flowPreference,
        richIdentityEnabled: next.richIdentityEnabled,
      },
    });
    await qc.invalidateQueries({ queryKey: APPS_KEY });
    return result;
  };
}

export function errorText(e: unknown, fallback = "Opslaan mislukt.") {
  return e instanceof Error && e.message ? e.message : fallback;
}
