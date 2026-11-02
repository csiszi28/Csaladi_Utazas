import { describe, expect, it } from "vitest";
import { fetchUrlPreview, validatePreviewUrl } from "../url-preview";

describe("validatePreviewUrl — SSRF védelem", () => {
  it.each([
    "http://localhost/x",
    "http://127.0.0.1/",
    "http://127.1.2.3/",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.5/",
    "http://172.20.1.1/",
    "http://192.168.1.1/",
    "http://100.64.0.1/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://[fe80::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://metadata.google.internal/",
    "http://intranet/",
    "http://2130706433/",
    "ftp://example.com/",
  ])("tiltja: %s", (url) => {
    expect(validatePreviewUrl(url)).toBeNull();
  });

  it("engedi a publikus címeket", () => {
    expect(validatePreviewUrl("https://example.com/path")).not.toBeNull();
    expect(validatePreviewUrl("http://8.8.8.8/")).not.toBeNull();
  });
});

describe("fetchUrlPreview — átirányítás", () => {
  it("privát címre mutató átirányítást nem követ", async () => {
    const calls: string[] = [];
    const fakeFetch = (async (input: string | URL | Request) => {
      calls.push(String(input));
      return new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data" },
      });
    }) as typeof fetch;

    const preview = await fetchUrlPreview("https://example.com/a-b", fakeFetch);
    expect(calls).toEqual(["https://example.com/a-b"]);
    expect(preview?.description).toBeNull();
  });
});
