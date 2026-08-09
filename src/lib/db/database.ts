import { Kysely, PostgresDialect } from "kysely";
import { Pool, types } from "pg";
import type { Database } from "./schema";

types.setTypeParser(1082, (value) => value);

const dialect = new PostgresDialect({
    pool: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),
});

export const db = new Kysely<Database>({
    dialect,
});