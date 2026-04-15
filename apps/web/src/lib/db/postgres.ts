import { sql } from "@vercel/postgres";

export { sql };

export const db = {
  query: <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => sql<T>(strings, ...values),
};

export type Row = Record<string, string | number | boolean | Date | null>;
