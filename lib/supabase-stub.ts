// A stand-in for the Supabase client, for checks that cannot run against the
// interim local backend: the account actions, which have no local path, and the
// Supabase branch of deleting a photo or a document — the branch production
// actually runs (specs/048 research Decisions 3-5).
//
// It records every call in order, so a test can assert not just what happened
// but in what order: a row deleted before its stored file is removed is exactly
// the bug worth catching.

export type StubResult = {
  data?: unknown;
  error?: { code?: string; message: string } | null;
  count?: number | null;
};

export type StubCall = {
  target: string;
  method: string;
  args: unknown[];
};

type TableConfig = StubResult | StubResult[];

const EMPTY: StubResult = { data: null, error: null };

const BUILDER_METHODS = [
  "select",
  "insert",
  "update",
  "upsert",
  "delete",
  "eq",
  "neq",
  "in",
  "is",
  "not",
  "gte",
  "lte",
  "like",
  "ilike",
  "order",
  "limit",
  "range",
  "single",
  "maybeSingle",
] as const;

/**
 * `tables` and `storage` map a name to the result the next call yields. Give an
 * array to answer successive calls differently — the first await takes the
 * first entry, and the last entry repeats once the list runs out.
 */
export function createSupabaseStub(config: {
  tables?: Record<string, TableConfig>;
  storage?: Record<string, TableConfig>;
} = {}) {
  const calls: StubCall[] = [];

  function nextResult(source: Record<string, TableConfig> | undefined, name: string): StubResult {
    const configured = source?.[name];
    if (!configured) return EMPTY;
    if (!Array.isArray(configured)) return configured;
    // Keep the last answer once the queue is exhausted, so a test only has to
    // describe the calls it cares about.
    return configured.length > 1 ? (configured.shift() as StubResult) : (configured[0] ?? EMPTY);
  }

  function builder(target: string, source: Record<string, TableConfig> | undefined) {
    const chain: Record<string, unknown> = {
      then: (resolve: (value: StubResult) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(nextResult(source, target)).then(resolve, reject),
    };
    for (const method of BUILDER_METHODS) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ target, method, args });
        return chain;
      };
    }
    return chain;
  }

  const client = {
    from: (table: string) => builder(table, config.tables),
    storage: {
      from: (bucket: string) => ({
        upload: async (...args: unknown[]) => {
          calls.push({ target: bucket, method: "storage.upload", args });
          return nextResult(config.storage, bucket);
        },
        remove: async (...args: unknown[]) => {
          calls.push({ target: bucket, method: "storage.remove", args });
          return nextResult(config.storage, bucket);
        },
        download: async (...args: unknown[]) => {
          calls.push({ target: bucket, method: "storage.download", args });
          return nextResult(config.storage, bucket);
        },
      }),
    },
    auth: {
      signOut: async () => {
        calls.push({ target: "auth", method: "signOut", args: [] });
        return nextResult(config.tables, "auth");
      },
    },
  };

  return {
    client,
    calls,
    /** Names of the calls made, in order — e.g. ["photos.select", "photos.storage.remove"]. */
    trail: () => calls.map((call) => `${call.target}.${call.method}`),
    called: (target: string, method: string) =>
      calls.some((call) => call.target === target && call.method === method),
  };
}
