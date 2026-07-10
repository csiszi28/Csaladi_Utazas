export interface UrlPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(lower)) return true;
  if (lower.endsWith(".local")) return true;
  if (/^10\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
  return false;
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
    const response = await fetchFn(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CsaladiUtazasBot/1.0; +https://csaladi-utazas)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) return fallback;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return fallback;
    }

    const html = await response.text();
    const preview = parseUrlPreviewFromHtml(html.slice(0, 200_000), parsed.toString());

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
