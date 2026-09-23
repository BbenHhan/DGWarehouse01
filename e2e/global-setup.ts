import seed from "./fixture";

// Runs once before the browser starts, so the first scenario finds the fixture
// already built. Each scenario rebuilds it again for itself — this is what
// makes the very first one, and a run of a single file, start from the same
// place as any other.
export default async function globalSetup() {
  await seed();
}
