const INVALID_MESSAGES = new Set(["{}", "[object Object]"]);

function cleanMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || INVALID_MESSAGES.has(trimmed)) return null;
  return trimmed;
}

/** Supabase AuthError – olvasható magyar üzenet (soha ne jelenjen meg "{}" ) */
export function formatAuthError(error: unknown): string {
  if (!error) return "Ismeretlen hiba történt";

  if (typeof error === "string") {
    return cleanMessage(error) ?? "Ismeretlen auth hiba történt";
  }

  if (typeof error === "object" && error !== null) {
    const e = error as {
      message?: string;
      msg?: string;
      error_description?: string;
      code?: string | number;
      status?: number;
    };

    const direct =
      cleanMessage(e.message) ??
      cleanMessage(e.msg) ??
      cleanMessage(e.error_description);

    if (direct) return direct;

    if (typeof e.message === "string" && e.message.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(e.message) as {
          msg?: string;
          error_description?: string;
          message?: string;
        };
        const nested =
          cleanMessage(parsed.msg) ??
          cleanMessage(parsed.error_description) ??
          cleanMessage(parsed.message);
        if (nested) return nested;
      } catch {
        // ignore invalid JSON in message field
      }
    }

    if (e.code === "over_email_send_rate_limit") {
      return "Túl sok e-mail kérés. Várj pár percet, majd próbáld újra.";
    }

    if (e.code) {
      return `Supabase auth hiba: ${String(e.code)}`;
    }

    if (e.status === 500) {
      return (
        "Supabase auth szerverhiba (500). Ellenőrizd: Dashboard → Authentication → Logs, " +
        "és hogy a .env.local Supabase URL ugyanarra a projektre mutat, amit a Network fülön látsz."
      );
    }

    if (e.status === 422) {
      return "Érvénytelen regisztrációs adatok vagy redirect URL. Ellenőrizd a Supabase Redirect URLs beállítást.";
    }

    if (e.status) {
      return `Supabase auth hiba (HTTP ${e.status})`;
    }
  }

  if (error instanceof Error) {
    const msg = cleanMessage(error.message);
    if (msg) return msg;
  }

  return "Ismeretlen auth hiba történt";
}
