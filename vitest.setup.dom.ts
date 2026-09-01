// DOM-only test setup, imported by the component test files that opt into the
// jsdom environment with a `@vitest-environment jsdom` docblock. Kept out of
// vitest.setup.ts (which runs for every file) because jest-dom's matchers and
// Testing Library's cleanup both need a real `document`, and the default
// environment for this project is still "node".
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  // Testing Library only unmounts what it rendered into its own container.
  // Base UI renders popups (Select listboxes, Dialog content) through portals
  // attached straight to document.body, so those survive cleanup and the next
  // test's queries can match a previous test's leftovers — which is exactly how
  // a passing delete-dialog test started failing once the file grew. Clearing
  // the body afterwards keeps each test looking only at its own DOM.
  document.body.innerHTML = "";
});
