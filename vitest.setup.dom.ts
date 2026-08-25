// DOM-only test setup, imported by the component test files that opt into the
// jsdom environment with a `@vitest-environment jsdom` docblock. Kept out of
// vitest.setup.ts (which runs for every file) because jest-dom's matchers and
// Testing Library's cleanup both need a real `document`, and the default
// environment for this project is still "node".
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
