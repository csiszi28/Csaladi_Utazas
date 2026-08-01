import { getSiteUrl } from "@/lib/env";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { ok: true; provider: "resend" }
  | { ok: false; reason: "not_configured" | "invalid_recipient" | "send_failed"; detail?: string };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function humanizeResendError(status: number, raw: string): string {
  const lower = raw.toLowerCase();

  if (
    lower.includes("only send testing emails") ||
    lower.includes("you can only send") ||
    lower.includes("verify a domain")
  ) {
    return (
      "A Resend teszt-feladó csak a saját fiókod e-mail címére küldhet. " +
      "Ellenőrizd a domainet a Resend Dashboardon, és állítsd be a RESEND_FROM_EMAIL-t " +
      "(pl. Családi Utazás <hello@sajatdomain.hu>)."
    );
  }

  if (lower.includes("invalid api key") || status === 401) {
    return "Érvénytelen RESEND_API_KEY. Ellenőrizd a Vercel / .env.local kulcsot.";
  }

  if (status === 403) {
    return (
      "A Resend elutasította a küldést (403). Gyakori ok: nem igazolt domain, " +
      "vagy a teszt-feladó csak a saját címedre küldhet."
    );
  }

  if (status === 422) {
    return "A Resend érvénytelennek találta a feladót vagy a címzettet. Ellenőrizd a RESEND_FROM_EMAIL-t.";
  }

  try {
    const parsed = JSON.parse(raw) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    /* ignore */
  }

  if (raw.trim()) return raw.trim().slice(0, 220);
  return `Resend hiba (HTTP ${status})`;
}

/** Optional Resend integration — no-op when RESEND_API_KEY is missing. */
export async function sendTransactionalEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Családi Utazás <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, reason: "not_configured" };
  }

  const to = input.to.trim();
  if (!isValidEmail(to)) {
    return { ok: false, reason: "invalid_recipient" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.subject,
        text: input.text,
        html:
          input.html ??
          `<pre style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(input.text)}</pre>`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        reason: "send_failed",
        detail: humanizeResendError(res.status, detail),
      };
    }

    return { ok: true, provider: "resend" };
  } catch (error) {
    return {
      ok: false,
      reason: "send_failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildTripInviteEmail(opts: {
  tripTitle: string;
  inviteCode: string;
  inviterName: string;
}) {
  const siteUrl = getSiteUrl();
  const inviteUrl = `${siteUrl}/trips/join?code=${encodeURIComponent(opts.inviteCode)}`;
  const subject = `Csatlakozz: ${opts.tripTitle}`;
  const text = [
    `Szia!`,
    ``,
    `${opts.inviterName} meghívott a(z) „${opts.tripTitle}” utazáshoz a Családi Utazás appban.`,
    ``,
    `Csatlakozás: ${inviteUrl}`,
    `Meghívó kód: ${opts.inviteCode}`,
    ``,
    `Ha még nincs fiókod, regisztrálj ugyanazzal az e-mail címmel, majd nyisd meg a linket.`,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:32rem">
      <p>Szia!</p>
      <p><strong>${escapeHtml(opts.inviterName)}</strong> meghívott a(z)
        <strong>${escapeHtml(opts.tripTitle)}</strong> utazáshoz.</p>
      <p style="margin:1.5rem 0">
        <a href="${inviteUrl}"
           style="display:inline-block;background:#0f766e;color:#fff;padding:0.75rem 1.25rem;border-radius:0.75rem;text-decoration:none;font-weight:600">
          Csatlakozás az utazáshoz
        </a>
      </p>
      <p style="font-size:0.875rem;color:#64748b">
        Vagy add meg ezt a kódot: <code style="font-size:1rem;letter-spacing:0.08em">${escapeHtml(opts.inviteCode)}</code>
      </p>
    </div>
  `;

  return { subject, text, html, inviteUrl };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
