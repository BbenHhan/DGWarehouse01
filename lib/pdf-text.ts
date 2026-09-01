// Pulls a little text out of a PDF entirely inside the browser, to help guess
// which sub-group a file belongs to (lib/document-suggest.ts).
//
// Nothing is uploaded and no service is called: pdf.js reads the bytes the
// browser already holds. That is the whole reason this approach was chosen
// over sending documents to an AI service — these are company records with
// contracts and people's names in them.
//
// Best-effort by design. A scanned PDF is images with no text layer and will
// yield nothing; that is a normal outcome, not an error, and the caller simply
// falls back to matching on the file name.

/** Enough words to recognise a subject; reading further costs time for nothing. */
const MAX_PAGES = 2;
const MAX_CHARS = 4000;

export async function extractPdfText(file: File): Promise<string> {
  try {
    // Imported on demand: pdf.js is large, and most sessions never open the
    // bulk upload page at all.
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buffer }).promise;

    let text = "";
    for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, MAX_PAGES); pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if ("str" in item) text += `${item.str} `;
        if (text.length >= MAX_CHARS) break;
      }
      if (text.length >= MAX_CHARS) break;
    }

    await doc.cleanup();
    return text.slice(0, MAX_CHARS);
  } catch {
    // A corrupt file, an encrypted one, or a worker that failed to load. The
    // suggestion falls back to the file name, which is no worse than before
    // this existed.
    return "";
  }
}
