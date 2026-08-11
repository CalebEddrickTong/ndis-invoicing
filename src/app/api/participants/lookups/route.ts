import { db } from "@/lib/db/database";

export async function GET() {
    try {
        const genders = await db
            .selectFrom("gender")
            .select(["id", "code", "label"])
            .where("deactivated_at", "is", null)
            .orderBy("id")
            .execute();

        const pricingRegions = await db
            .selectFrom("rate_set_support_item_pricing_region")
            .select(["code", "label", "full_label"])
            .where("deactivated_at", "is", null)
            .orderBy("code")
            .execute();

        return Response.json({
            success: true,
            data: {
                genders,
                pricing_regions: pricingRegions,
            },
        });
    } catch (error) {
        console.error("Load participant lookups failed:", error);

        return Response.json(
            {
                message: "Failed to load participant lookup data.",
            },
            { status: 500 }
        );
    }
}