import { getSiteUrl } from "@/lib/env";
import { sendTransactionalEmail, isEmailConfigured } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";

export function getAuthCallbackUrl(next = "/") {
  const base = `${getSiteUrl().replace(/\/$/, "")}/auth/callback`;
  return next === "/" ? base : `${base}?next=${encodeURIComponent(next)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function authEmailShell(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote?: string;
}) {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  return `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Segoe UI,system-ui,-apple-system,sans-serif;color:#0f172a">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">
          <tr>
            <td style="background:linear-gradient(135deg,#002045 0%,#1a365d 55%,#2a4a7a 100%);padding:28px 28px 24px;color:#fff">
              <p style="margin:0 0 6px;font-size:13px;letter-spacing:.04em;opacity:.85;text-transform:uppercase">Családi Utazás</p>
              <h1 style="margin:0;font-size:22px;line-height:1.3;font-weight:700">${escapeHtml(opts.title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px">
              ${opts.bodyHtml}
              <p style="margin:28px 0 8px;text-align:center">
                <a href="${escapeHtml(opts.ctaUrl)}"
                   style="display:inline-block;background:#0f766e;color:#ffffff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
                  ${escapeHtml(opts.ctaLabel)}
                </a>
              </p>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all">
                Ha a gomb nem működik, másold be ezt a linket a böngészőbe:<br />
                <a href="${escapeHtml(opts.ctaUrl)}" style="color:#0f766e">${escapeHtml(opts.ctaUrl)}</a>
              </p>
              ${
                opts.footerNote
                  ? `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8">${escapeHtml(opts.footerNote)}</p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center">
              <a href="${escapeHtml(siteUrl)}" style="color:#64748b;text-decoration:none">${escapeHtml(siteUrl)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export function buildSignupConfirmEmail(opts: { name?: string; actionUrl: string }) {
  const greeting = opts.name?.trim() ? `Szia ${opts.name.trim()}!` : "Szia!";
  const subject = "Erősítsd meg a Családi Utazás fiókodat";
  const text = [
    greeting,
    "",
    "Köszönjük a regisztrációt. A fiókod aktiválásához kattints a linkre:",
    opts.actionUrl,
    "",
    "A link 24 órán át érvényes. Ha nem te regisztráltál, hagyd figyelmen kívül ezt az e-mailt.",
  ].join("\n");

  const html = authEmailShell({
    preheader: "Erősítsd meg az e-mail címed a Családi Utazás appban",
    title: "E-mail megerősítés",
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:16px;line-height:1.55">${escapeHtml(greeting)}</p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:#334155">
        Köszönjük a regisztrációt. Egy kattintással aktiválhatod a fiókodat, és máris tervezhetitek a közös utakat.
      </p>
    `,
    ctaLabel: "E-mail megerősítése",
    ctaUrl: opts.actionUrl,
    footerNote: "A link 24 órán át érvényes. Ha nem te regisztráltál, nyugodtan töröld az üzenetet.",
  });

  return { subject, text, html };
}

export function buildPasswordResetEmail(opts: { actionUrl: string }) {
  const subject = "Jelszó visszaállítás — Családi Utazás";
  const text = [
    "Szia!",
    "",
    "Jelszó-visszaállítási kérelmet kaptunk a Családi Utazás fiókodhoz.",
    "Új jelszó beállításához nyisd meg ezt a linket:",
    opts.actionUrl,
    "",
    "Ha nem te kérted, hagyd figyelmen kívül ezt az e-mailt.",
  ].join("\n");

  const html = authEmailShell({
    preheader: "Állítsd be az új jelszavadat",
    title: "Jelszó visszaállítás",
    bodyHtml: `
      <p style="margin:0 0 12px;font-size:16px;line-height:1.55">Szia!</p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:#334155">
        Jelszó-visszaállítási kérelmet kaptunk. Az alábbi gombbal biztonságosan megadhatod az új jelszavadat.
      </p>
    `,
    ctaLabel: "Új jelszó beállítása",
    ctaUrl: opts.actionUrl,
    footerNote: "Ha nem te kérted a visszaállítást, nincs teendőd — a jelszavad változatlan marad.",
  });

  return { subject, text, html };
}

type LinkType = "signup" | "recovery" | "magiclink";

async function generateAuthActionLink(opts: {
  type: LinkType;
  email: string;
  password?: string;
  redirectTo: string;
}): Promise<{ ok: true; actionLink: string } | { ok: false; error: string }> {
  const supabase = await createServiceClient();

  const result =
    opts.type === "signup"
      ? await supabase.auth.admin.generateLink({
          type: "signup",
          email: opts.email,
          password: opts.password || crypto.randomUUID(),
          options: { redirectTo: opts.redirectTo },
        })
      : opts.type === "recovery"
        ? await supabase.auth.admin.generateLink({
            type: "recovery",
            email: opts.email,
            options: { redirectTo: opts.redirectTo },
          })
        : await supabase.auth.admin.generateLink({
            type: "magiclink",
            email: opts.email,
            options: { redirectTo: opts.redirectTo },
          });

  const { data, error } = result;

  if (error) {
    return { ok: false, error: error.message };
  }

  const actionLink =
    data.properties?.action_link ??
    (data as { action_link?: string }).action_link ??
    null;

  if (!actionLink) {
    return { ok: false, error: "Nem sikerült megerősítő linket generálni" };
  }

  return { ok: true, actionLink };
}

/** Resend-en keresztül — nem a Supabase óránkénti e-mail kvótáját használja. */
export async function sendSignupConfirmViaResend(opts: {
  email: string;
  name?: string;
  password?: string;
}): Promise<{ ok: true } | { ok: false; error: string; fallbackToSupabase?: boolean }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Resend nincs beállítva", fallbackToSupabase: true };
  }

  const redirectTo = getAuthCallbackUrl("/");
  const link = await generateAuthActionLink({
    type: "signup",
    email: opts.email,
    password: opts.password,
    redirectTo,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const content = buildSignupConfirmEmail({
    name: opts.name,
    actionUrl: link.actionLink,
  });

  const sent = await sendTransactionalEmail({
    to: opts.email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  if (!sent.ok) {
    return {
      ok: false,
      error: sent.detail ?? "E-mail küldés sikertelen",
      fallbackToSupabase: sent.reason === "not_configured",
    };
  }

  return { ok: true };
}

export async function sendPasswordResetViaResend(opts: {
  email: string;
}): Promise<{ ok: true } | { ok: false; error: string; fallbackToSupabase?: boolean }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "Resend nincs beállítva", fallbackToSupabase: true };
  }

  const redirectTo = getAuthCallbackUrl("/auth/reset-password");
  const link = await generateAuthActionLink({
    type: "recovery",
    email: opts.email,
    redirectTo,
  });
  if (!link.ok) {
    // Ne szivárogtassuk, hogy létezik-e a fiók
    if (/not found|user not found|unable to find/i.test(link.error)) {
      return { ok: true };
    }
    return { ok: false, error: link.error };
  }

  const content = buildPasswordResetEmail({ actionUrl: link.actionLink });
  const sent = await sendTransactionalEmail({
    to: opts.email,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  if (!sent.ok) {
    return {
      ok: false,
      error: sent.detail ?? "E-mail küldés sikertelen",
      fallbackToSupabase: sent.reason === "not_configured",
    };
  }

  return { ok: true };
}
