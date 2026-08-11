import { db } from "@/lib/db/database";

type RateSetInput = {
    name?: unknown;
    description?: unknown;
    start_date?: unknown;
    end_date?: unknown;
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const rateSetId = Number(id);

    if (!Number.isInteger(rateSetId) || rateSetId <= 0) {
        return Response.json(
            {
                success: false,
                error: "Invalid rate set ID",
            },
            { status: 400 }
        );
    }

    const rateSet = await db
        .selectFrom("rate_set")
        .select([
            "id",
            "name",
            "description",
            "start_date",
            "end_date",
            "created_at",
            "updated_at",
        ])
        .where("id", "=", rateSetId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

    if (!rateSet) {
        return Response.json(
            {
                success: false,
                error: "Rate set not found",
            },
            { status: 404 }
        );
    }

    return Response.json({
        success: true,
        data: rateSet,
    });
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const rateSetId = Number(id);

    if (!Number.isInteger(rateSetId) || rateSetId <= 0) {
        return Response.json(
            {
                success: false,
                error: "Invalid rate set ID",
            },
            { status: 400 }
        );
    }

    // extension validation block
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

    // Attempt successful response
    try {
        const rateSet = await db
            .updateTable("rate_set")
            .set({
                name,
                description,
                start_date: new Date(startDate),
                end_date: endDate ? new Date(endDate) : null,
                updated_at: new Date(),
            })
            .where("id", "=", rateSetId)
            .where("deleted_at", "is", null)
            .returning([
                "id",
                "name",
                "description",
                "start_date",
                "end_date",
                "updated_at",
            ])
            .executeTakeFirst();

        if (!rateSet) {
            return Response.json(
                {
                    message: "Rate set not found.",
                },
                { status: 404 }
            );
        }

        return Response.json({
            data: rateSet,
        });
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

        console.error("Update rate set failed:", error);

        return Response.json(
            {
                message: "Unable to update rate set.",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const rateSetId = Number(id);

    if (!Number.isInteger(rateSetId) || rateSetId <= 0) {
        return Response.json(
            {
                success: false,
                error: "Invalid rate set ID",
            },
            { status: 400 }
        );
    }

    const rateSet = await db
        .updateTable("rate_set")
        .set({
            deleted_at: new Date(),
            updated_at: new Date(),
        })
        .where("id", "=", rateSetId)
        .where("deleted_at", "is", null)
        .returning(["id", "name"])
        .executeTakeFirst();

    if (!rateSet) {
        return Response.json(
            {
                success: false,
                error: "Rate set not found",
            },
            { status: 404 }
        );
    }

    return Response.json({
        success: true,
        data: rateSet,
    });
}
