import { db } from "@/lib/db/database";

export async function GET() {
    try {
        const rateSets = await db
            .selectFrom("rate_set")
            .select([
                "id",
                "name",
                "start_date",
                "end_date",
            ])
            .where("deleted_at", "is", null)
            .orderBy("start_date", "desc")
            .execute();

        const categories = await db
            .selectFrom("rate_set_category")
            .select([
                "id",
                "rate_set_id",
                "category_number",
                "category_name",
                "sorting",
            ])
            .where("deactivated_at", "is", null)
            .orderBy("sorting")
            .orderBy("id")
            .execute();

        const supportItems = await db
            .selectFrom("rate_set_support_item")
            .select([
                "id",
                "rate_set_id",
                "category_id",
                "item_number",
                "item_name",
                "unit",
                "sorting",
            ])
            .where("deactivated_at", "is", null)
            .orderBy("sorting")
            .orderBy("id")
            .execute();

        return Response.json({
            success: true,
            data: {
                rate_sets: rateSets,
                categories,
                support_items: supportItems,
            },
        });
    } catch (error) {
        console.error("Load invoice lookups failed:", error);

        return Response.json(
            {
                message: "Failed to load invoice lookup data.",
            },
            { status: 500 }
        );
    }
}