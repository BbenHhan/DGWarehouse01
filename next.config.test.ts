import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

// An upload larger than the middleware's own body ceiling arrives at the Server
// Action truncated, and multipart parsing then fails with "Unexpected end of
// form" — which reads as a corrupt file, not as a size limit. It cost a live
// bug report to find, because nothing about the message points at a ceiling.
//
// Two separate limits have to agree, and the pair is easy to break by editing
// one: bodySizeLimit governs the action, middlewareClientMaxBodySize governs
// what reaches it. Stored documents run to 30MB and Constitution VIII asks the
// ceiling to admit real video, so both must stay well above that.
function toBytes(size: string): number {
  const match = /^(\d+(?:\.\d+)?)(kb|mb|gb)$/i.exec(size.trim());
  if (!match) throw new Error(`unrecognised size: ${size}`);
  const units = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  return Number(match[1]) * units[match[2].toLowerCase() as keyof typeof units];
}

describe("upload size ceilings", () => {
  const experimental = nextConfig.experimental!;
  const actionLimit = experimental.serverActions!.bodySizeLimit as string;
  const middlewareLimit = experimental.middlewareClientMaxBodySize as string;

  it("lets the middleware pass a body at least as large as the action accepts", () => {
    expect(toBytes(middlewareLimit)).toBeGreaterThanOrEqual(toBytes(actionLimit));
  });

  it("admits a real video, well past the 30MB documents already stored", () => {
    expect(toBytes(middlewareLimit)).toBeGreaterThan(toBytes("100mb"));
    expect(toBytes(actionLimit)).toBeGreaterThan(toBytes("100mb"));
  });

  it("is set at all — the default middleware ceiling is 10MB and silently truncates", () => {
    expect(middlewareLimit).toBeDefined();
  });
});
