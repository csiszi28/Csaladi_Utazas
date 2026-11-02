export interface UrlPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

const MAX_REDIRECTS = 3;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "[::]",
  "[::1]",
  "metadata.google.internal",
]);

/** SSRF ellen: belső, loopback, link-local (felhő metadata: 169.254.169.254) és privát címek tiltása. */
function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = [Number(match[1]), Number(match[2])];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return a >= 224; // multicast / reserved
}

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(lower)) return true;
  if (lower.endsWith(".local") || lower.endsWith(".localhost") || lower.endsWith(".internal")) {
    return true;
  }
  if (isPrivateIpv4(lower)) return true;

  if (lower.startsWith("[")) {
    // IPv6: loopback, ULA (fc00::/7), link-local (fe80::/10), IPv4-mapped (::ffff:a.b.c.d)
    const inner = lower.slice(1, -1);
    if (inner === "::" || inner === "::1") return true;
    if (/^f[cd]/.test(inner) || /^fe[89ab]/.test(inner)) return true;
    const mapped = inner.match(/^::ffff:(.+)$/);
    if (mapped) {
      const rest = mapped[1];
      return isPrivateIpv4(rest) || /^[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(rest);
    }
    return false;
  }

  // Pont nélküli név (pl. "intranet") csak belső hálózaton oldódik fel
  return !lower.includes(".");
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return null;
}

function extractTitle(html: string): string | null {
  const og = extractMetaContent(html, "og:title");
  if (og) return og;
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

export function parseUrlPreviewFromHtml(html: string, url: string): UrlPreviewData {
  return {
    url,
    title: extractTitle(html),
    description:
      extractMetaContent(html, "og:description") ??
      extractMetaContent(html, "description"),
    image: extractMetaContent(html, "og:image"),
    siteName: extractMetaContent(html, "og:site_name"),
  };
}

export function titleFromUrlPath(parsed: URL): string {
  const slug = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
  const cleaned = slug
    .replace(/-t\d+$/i, "")
    .replace(/-l\d+$/i, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return parsed.hostname.replace(/^www\./i, "");
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function buildMinimalUrlPreview(rawUrl: string): UrlPreviewData | null {
  const parsed = validatePreviewUrl(rawUrl);
  if (!parsed) return null;

  const siteName = parsed.hostname.replace(/^www\./i, "");

  return {
    url: parsed.toString(),
    title: titleFromUrlPath(parsed),
    description: null,
    image: null,
    siteName,
  };
}

export function validatePreviewUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (isPrivateHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

const MAX_HTML_BYTES = 200_000;

/** Legfeljebb `limit` bájtot olvas — ne töltsön le óriási oldalakat a memóriába. */
async function readLimitedText(response: Response, limit: number): Promise<string> {
  if (!response.body) return (await response.text()).slice(0, limit);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  while (received < limit) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  void reader.cancel().catch(() => undefined);
  return text.slice(0, limit);
}

export async function fetchUrlPreview(
  rawUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<UrlPreviewData | null> {
  const parsed = validatePreviewUrl(rawUrl);
  if (!parsed) return null;

  const fallback = buildMinimalUrlPreview(rawUrl)!;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    // Átirányítást kézzel követjük, hogy minden lépést újra ellenőrizzünk (SSRF-védelem).
    let current = parsed;
    let response: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      response = await fetchFn(current.toString(), {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CsaladiUtazasBot/1.0; +https://csaladi-utazas)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        const next = location ? validatePreviewUrl(new URL(location, current).toString()) : null;
        if (!next) return fallback;
        current = next;
        response = null;
        continue;
      }
      break;
    }

    if (!response || !response.ok) return fallback;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return fallback;
    }

    const html = await readLimitedText(response, MAX_HTML_BYTES);
    const preview = parseUrlPreviewFromHtml(html, parsed.toString());

    if (!preview.title) {
      preview.title = fallback.title;
    }

    if (!preview.siteName) {
      preview.siteName = fallback.siteName;
    }

    if (preview.image && preview.image.startsWith("/")) {
      preview.image = new URL(preview.image, parsed.origin).toString();
    }

    return preview;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
