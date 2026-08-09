import { readdir, readFile } from "node:fs/promises";
import * as path from "node:path";
import { loadEnvFile } from "node:process";
import { Pool } from "pg";

loadEnvFile(".env.local");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
}

const migrationsFolder = path.join(
    process.cwd(),
    "db",
    "migrations"
);

const pool = new Pool({
    connectionString,
});

async function migrate(): Promise<void> {
    const client = await pool.connect();

    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migration (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

        const appliedResult = await client.query<{ name: string }>(
            "SELECT name FROM schema_migration"
        );

        const applied = new Set(
            appliedResult.rows.map((row) => row.name)
        );

        const migrationFiles = (await readdir(migrationsFolder))
            .filter((file) => file.endsWith(".sql"))
            .sort((a, b) => a.localeCompare(b));

        for (const file of migrationFiles) {
            if (applied.has(file)) {
                console.log(`Skipping ${file}, already applied`);
                continue;
            }

            const migrationPath = path.join(
                migrationsFolder,
                file
            );

            const sql = await readFile(
                migrationPath,
                "utf8"
            );

            console.log(`Applying ${file}...`);

            await client.query("BEGIN");

            try {
                await client.query(sql);

                await client.query(
                    "INSERT INTO schema_migration (name) VALUES ($1)",
                    [file]
                );

                await client.query("COMMIT");

                console.log(`Applied ${file}`);
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            }
        }
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch((error) => {
    console.error("Migration failed");
    console.error(error);
    process.exitCode = 1;
});