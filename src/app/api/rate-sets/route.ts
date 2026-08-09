import { db } from "../../../lib/db/database";

export async function GET() {
    const rateSets = await db
        .selectFrom("rate_set")
        .select([
            "id",
            "name",
            "description",
            "start_date",
            "end_date",
            "created_at",
            "updated_at",
            "deactivated_at",
        ])
        .where("deleted_at", "is", null)
        .orderBy("start_date", "desc")
        .execute();

    return Response.json({
        data: rateSets,
    });
}

type RateSetInput = {
    name?: unknown;
    description?: unknown;
    start_date?: unknown;
    end_date?: unknown;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as RateSetInput;

        const name =
            typeof body.name === "string" ? body.name.trim() : "";

        const description =
            typeof body.description === "string"
                ? body.description.trim() || null
                : null;

        const startDate =
            typeof body.start_date === "string"
                ? body.start_date.trim()
                : "";

        const endDate =
            typeof body.end_date === "string" && body.end_date.trim()
                ? body.end_date.trim()
                : null;

        const errors: Record<string, string> = {};

        if (!name) {
            errors.name = "Rate set name is required.";
        }

        if (!startDate || Number.isNaN(Date.parse(startDate))) {
            errors.start_date = "Valid start date is required.";
        }

        if (endDate && Number.isNaN(Date.parse(endDate))) {
            errors.end_date = "End date must be a valid date.";
        }

        if (
            startDate &&
            endDate &&
            !Number.isNaN(Date.parse(startDate)) &&
            !Number.isNaN(Date.parse(endDate)) &&
            new Date(startDate) > new Date(endDate)
        ) {
            errors.end_date =
                "End date must be on or after the start date.";
        }

        if (Object.keys(errors).length > 0) {
            return Response.json(
                {
                    message: "Validation failed.",
                    errors,
                },
                { status: 400 }
            );
        }

        const rateSet = await db
            .insertInto("rate_set")
            .values({
                name,
                description,
                start_date: new Date(startDate),
                end_date: endDate ? new Date(endDate) : null,
            })
            .returning([
                "id",
                "name",
                "description",
                "start_date",
                "end_date",
            ])
            .executeTakeFirstOrThrow();

        return Response.json(
            {
                data: rateSet,
            },
            { status: 201 }
        );
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23P01"
        ) {
            return Response.json(
                {
                    message:
                        "This rate set overlaps with an existing active rate set.",
                },
                { status: 409 }
            );
        }

        console.error("Create rate set failed:", error);

        return Response.json(
            {
                message: "Unable to create rate set.",
            },
            { status: 500 }
        );
    }
}

