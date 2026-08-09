import { db } from "../../../../lib/db/database";

export async function GET() {
    try {
        await db
            .selectFrom("gender")
            .select("id")
            .limit(1)
            .execute();

        return Response.json({
            status: "ok",
            database: "connected",
        });
    } catch (error) {
        console.error("Database health check failed:", error);

        return Response.json(
            {
                status: "error",
                database: "disconnected",
            },
            {
                status: 500,
            }
        );
    }
}