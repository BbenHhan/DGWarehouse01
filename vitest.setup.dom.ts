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

// jsdom has never implemented URL.createObjectURL. Until jsdom 30.1 a call with
// a File built from Node's own File class happened to return a blob: URL; from
// 30.1 it throws ("Cannot read properties of undefined (reading '_buffer')")
// because that File is not one of jsdom's Blobs. Components that preview a
// picked file call it for every file they hold, so without a stand-in the whole
// tray fails to build and the DOM never appears. The URL's value is never
// asserted on — only that an element carries one — so a counter is enough.
let objectUrlSerial = 0;
URL.createObjectURL = () => `blob:test/${++objectUrlSerial}`;
URL.revokeObjectURL = () => {};
