import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/middleware";
import { needsStepUp, shareRichIdentity, STRICT_ACR } from "./step-up";

/**
 * Server-functies voor de ROUT Developer Console en het toestemmingsscherm.
 *
 * Elke functie controleert zelf de sessie; apps horen altijd bij de gebruiker
 * die ze aanmaakte. Clientsecrets verlaten de server maar één keer: op het
 * moment dat ze gemaakt of geroteerd worden.
 */

const urlish = z.string().trim().max(300).nullable().optional();

const clientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  logoUrl: urlish,
  homepageUrl: urlish,
  privacyUrl: urlish,
  termsUrl: urlish,
  redirectUris: z.array(z.string().trim().max(300)).max(20),
  scopes: z.array(z.enum(["openid", "profile", "email", "linked_accounts"])).max(4),
  flowPreference: z.enum(["seamless", "strict"]).optional(),
  richIdentityEnabled: z.boolean().optional(),
});

async function assertVerified(userId: string) {
  const { isVerifiedDeveloper } = await import("./provider.server");
  if (!(await isVerifiedDeveloper(userId))) {
    throw new Error("De Developer Console is beschikbaar voor geverifieerde leden.");
  }
}

export const consoleAccess = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const { isVerifiedDeveloper } = await import("./provider.server");
    return { verified: await isVerifiedDeveloper(context.userId) };
  });

export const listOAuthClients = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await assertVerified(context.userId);
    const { listClients } = await import("./provider.server");
    return listClients(context.userId);
  });

export const saveOAuthClient = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => clientSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertVerified(context.userId);
    const { createClient, updateClient } = await import("./provider.server");
    const input = {
      name: data.name,
      logoUrl: data.logoUrl ?? null,
      homepageUrl: data.homepageUrl ?? null,
      privacyUrl: data.privacyUrl ?? null,
      termsUrl: data.termsUrl ?? null,
      redirectUris: data.redirectUris,
      scopes: data.scopes,
      ...(data.flowPreference ? { flowPreference: data.flowPreference } : {}),
      ...(data.richIdentityEnabled !== undefined ? { richIdentityEnabled: data.richIdentityEnabled } : {}),
    };
    if (data.id) {
      return { client: await updateClient(context.userId, data.id, input), clientSecret: null };
    }
    return createClient(context.userId, input);
  });

export const deleteOAuthClient = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertVerified(context.userId);
    const { deleteClient } = await import("./provider.server");
    await deleteClient(context.userId, data.id);
    return { ok: true };
  });

export const rotateOAuthSecret = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertVerified(context.userId);
    const { rotateClientSecret } = await import("./provider.server");
    return { clientSecret: await rotateClientSecret(context.userId, data.id) };
  });

/* ------------------------------------------------ toestemmingsscherm ----- */

const authorizeSchema = z.object({
  clientId: z.string().min(4).max(120),
  redirectUri: z.string().min(4).max(300),
  scope: z.string().max(200).optional(),
  state: z.string().max(300).nullable().optional(),
  nonce: z.string().max(300).nullable().optional(),
  codeChallenge: z.string().min(20).max(200),
  codeChallengeMethod: z.string().max(10),
  prompt: z.string().max(60).nullable().optional(),
  maxAge: z.string().max(12).nullable().optional(),
  acrValues: z.string().max(200).nullable().optional(),
});

export type AuthorizePrompt = {
  ok: boolean;
  error?: string;
  app?: {
    name: string;
    logoUrl: string | null;
    homepageUrl: string | null;
    privacyUrl: string | null;
    termsUrl: string | null;
  };
  scopes?: string[];
  account?: { email: string; name: string | null; handle: string | null; avatarUrl: string | null };
  alreadyGranted?: boolean;
  /** Strict flow / prompt=login / max_age / acr_values → extra code vereist. */
  requiresStepUp?: boolean;
  /** App vraagt (optioneel) publieke activiteit. */
  richIdentity?: boolean;
};

async function profileOf(userId: string) {
  const { sql } = await import("@/lib/neon");
  try {
    const rows = (await sql`select username, avatar_url from public.profiles
      where user_id = ${userId} or id = ${userId} limit 1`) as Record<string, unknown>[];
    return {
      handle: (rows[0]?.["username"] as string | null) ?? null,
      avatarUrl: (rows[0]?.["avatar_url"] as string | null) ?? null,
    };
  } catch {
    return { handle: null, avatarUrl: null };
  }
}

export const describeAuthorizeRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => authorizeSchema.parse(data))
  .handler(async ({ data, context }): Promise<AuthorizePrompt> => {
    const { getClientByClientId, redirectAllowed, hasConsent, SUPPORTED_SCOPES } = await import(
      "./provider.server"
    );
    if (data.codeChallengeMethod !== "S256") {
      return { ok: false, error: "Deze app moet PKCE met S256 gebruiken." };
    }
    const client = await getClientByClientId(data.clientId);
    if (!client || client.status !== "active") {
      return { ok: false, error: "Deze app is onbekend bij ROUT." };
    }
    if (!redirectAllowed(client, data.redirectUri)) {
      return { ok: false, error: "Het terugkeeradres van deze app klopt niet." };
    }
    const requested = (data.scope ?? "openid").split(" ").filter(Boolean);
    const scopes = requested.filter(
      (s) => client.scopes.includes(s) && SUPPORTED_SCOPES.includes(s as never),
    );
    if (!scopes.includes("openid")) scopes.unshift("openid");
    const unknown = requested.find((s) => !scopes.includes(s));
    if (unknown) return { ok: false, error: `Deze app vraagt een recht dat niet mag: ${unknown}.` };

    return {
      ok: true,
      app: {
        name: client.name,
        logoUrl: client.logoUrl,
        homepageUrl: client.homepageUrl,
        privacyUrl: client.privacyUrl,
        termsUrl: client.termsUrl,
      },
      scopes,
      account: {
        email: context.user.email,
        name: (context.user.userMetadata["full_name"] as string | null) ?? null,
        ...(await profileOf(context.userId)),
      },
      alreadyGranted: await hasConsent(context.userId, client.clientId, scopes),
      requiresStepUp: needsStepUp({
        flowPreference: client.flowPreference,
        prompt: data.prompt ?? null,
        maxAge: data.maxAge ?? null,
        acrValues: data.acrValues ?? null,
      }),
      richIdentity: client.richIdentityEnabled,
    };
  });

export const decideAuthorizeRequest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) =>
    authorizeSchema.extend({ allow: z.boolean(), richIdentityOptIn: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ redirectTo: string } | { error: string }> => {
    const { getClientByClientId, redirectAllowed, issueAuthorizationCode, rememberConsent } =
      await import("./provider.server");
    const client = await getClientByClientId(data.clientId);
    if (!client || client.status !== "active") return { error: "Deze app is onbekend bij ROUT." };
    if (!redirectAllowed(client, data.redirectUri)) {
      return { error: "Het terugkeeradres van deze app klopt niet." };
    }
    if (data.codeChallengeMethod !== "S256") return { error: "PKCE S256 is verplicht." };

    const target = new URL(data.redirectUri);
    if (data.state) target.searchParams.set("state", data.state);

    if (!data.allow) {
      target.searchParams.set("error", "access_denied");
      target.searchParams.set("error_description", "De gebruiker gaf geen toestemming.");
      return { redirectTo: target.toString() };
    }

    const scopes = (data.scope ?? "openid")
      .split(" ")
      .filter((s) => s && client.scopes.includes(s));
    if (!scopes.includes("openid")) scopes.unshift("openid");

    const stepUp = needsStepUp({
      flowPreference: client.flowPreference,
      prompt: data.prompt ?? null,
      maxAge: data.maxAge ?? null,
      acrValues: data.acrValues ?? null,
    });
    if (stepUp) {
      const { consumeVerifiedStepUp } = await import("./provider.server");
      if (!(await consumeVerifiedStepUp(context.userId, client.clientId))) {
        return { error: "Bevestig eerst de verificatiecode." };
      }
    }

    const code = await issueAuthorizationCode({
      acr: stepUp ? STRICT_ACR : null,
      richIdentity: shareRichIdentity(client.richIdentityEnabled, Boolean(data.richIdentityOptIn)),
      clientId: client.clientId,
      userId: context.userId,
      redirectUri: data.redirectUri,
      scopes,
      codeChallenge: data.codeChallenge,
      nonce: data.nonce ?? null,
    });
    await rememberConsent(context.userId, client.clientId, scopes);
    target.searchParams.set("code", code);
    return { redirectTo: target.toString() };
  });

/* ------------------------------------------------------------ step-up ---- */

export const sendStepUpCode = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => z.object({ clientId: z.string().min(4).max(120) }).parse(data))
  .handler(async ({ data, context }) => {
    const { getClientByClientId, createStepUpCode } = await import("./provider.server");
    const client = await getClientByClientId(data.clientId);
    if (!client || client.status !== "active") return { ok: false, error: "Deze app is onbekend bij ROUT." };
    const code = await createStepUpCode(context.userId, client.clientId);
    const { sendTransactionalEmail } = await import("@/lib/notifications.server");
    const safeName = client.name.replace(/[<>&"]/g, "");
    const sent = await sendTransactionalEmail({
      to: context.user.email,
      subject: `Je ROUT-code: ${code}`,
      html: `<p>Je verificatiecode om door te gaan naar <strong>${safeName}</strong>:</p>
             <p style="font-size:28px;letter-spacing:6px;font-family:monospace"><strong>${code}</strong></p>
             <p>Deze code is 10 minuten geldig. Vroeg je dit niet aan? Negeer dan deze e-mail.</p>`,
      tags: ["oauth-step-up"],
    });
    const [user, domain] = context.user.email.split("@");
    const masked = `${(user ?? "").slice(0, 2)}•••@${domain ?? ""}`;
    return sent ? { ok: true, sentTo: masked } : { ok: false, error: "De code kon niet verstuurd worden." };
  });

export const verifyStepUp = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) =>
    z.object({ clientId: z.string().min(4).max(120), code: z.string().regex(/^\d{6}$/) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { verifyStepUpCode } = await import("./provider.server");
    const state = await verifyStepUpCode(context.userId, data.clientId, data.code);
    const messages: Record<string, string> = {
      ok: "",
      wrong: "Die code klopt niet.",
      expired: "Deze code is verlopen. Vraag een nieuwe aan.",
      locked: "Te veel pogingen. Vraag een nieuwe code aan.",
      missing: "Vraag eerst een code aan.",
    };
    return { ok: state === "ok", error: messages[state] ?? "" };
  });
