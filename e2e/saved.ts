import type { Page, Response } from "@playwright/test";

// Every editing control in this app updates the screen before the server has
// answered (Constitution V), so what is on screen a moment after a tap is not
// yet what is stored. A scenario that reloads at that moment cancels the save
// it was about to check — which is a flaky scenario, not a defect.
//
// This waits for the Server Action's own request to be answered, which is after
// the change is stored. Server Actions POST to the page's own address, so
// nothing else on the page is mistaken for one.
export async function saved(page: Page, act: () => Promise<void>): Promise<void> {
  // The headers are the signal, not the body: a Server Action answers with a
  // stream the page may hold open long after the write itself is done.
  const answered = page.waitForResponse(
    (response: Response) => response.request().method() === "POST" && response.url() === page.url(),
    { timeout: 15_000 }
  );
  await act();
  await answered;
}
