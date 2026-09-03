import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithProgress, formatBytes } from "@/lib/fetch-with-progress";

function streamingResponse(chunks: string[], headers: Record<string, string>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers });
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchWithProgress", () => {
  it("reports a share as the body streams in when a length is declared", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        streamingResponse(["aaaa", "bbbb"], {
          "Content-Length": "8",
          "Content-Type": "application/pdf",
        })
      )
    );

    const seen: Array<[number, number | null]> = [];
    const blob = await fetchWithProgress("/file.pdf", (received, total) =>
      seen.push([received, total])
    );

    expect(seen).toEqual([
      [4, 8],
      [8, 8],
    ]);
    expect(blob.size).toBe(8);
    expect(blob.type).toBe("application/pdf");
  });

  it("reports bytes received with no share when the server declares no length", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => streamingResponse(["abc"], { "Content-Type": "application/pdf" }))
    );

    const seen: Array<[number, number | null]> = [];
    await fetchWithProgress("/file.pdf", (received, total) => seen.push([received, total]));

    expect(seen).toEqual([[3, null]]);
  });

  it("rejects on a failed response so the caller can fall back", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));

    await expect(fetchWithProgress("/missing.pdf", () => {})).rejects.toThrow("404");
  });

  it("downloads the file exactly once", async () => {
    const fetchMock = vi.fn(async () =>
      streamingResponse(["xy"], { "Content-Length": "2" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithProgress("/file.pdf", () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("formatBytes", () => {
  it("scales to the unit the size belongs in", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(24 * 1024 * 1024)).toBe("24.0 MB");
  });
});
