import { db } from "../../../../lib/db/database";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const providerId = Number(id);

    if (!Number.isInteger(providerId) || providerId <= 0) {
        return Response.json(
            { message: "Invalid provider ID." },
            { status: 400 }
        );
    }

    const provider = await db
        .selectFrom("provider")
        .select([
            "id",
            "abn",
            "name",
            "email",
            "phone_number",
            "address",
            "unit_building",
            "created_at",
            "updated_at",
        ])
        .where("id", "=", providerId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

    if (!provider) {
        return Response.json(
            { message: "Provider not found." },
            { status: 404 }
        );
    }

    return Response.json({
        data: provider,
    });
}

type ProviderUpdateInput = {
    abn?: unknown;
    name?: unknown;
    email?: unknown;
    phone_number?: unknown;
    address?: unknown;
    unit_building?: unknown;
};

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const providerId = Number(id);

    if (!Number.isInteger(providerId) || providerId <= 0) {
        return Response.json(
            { message: "Invalid provider ID." },
            { status: 400 }
        );
    }

    const existing = await db
        .selectFrom("provider")
        .select("id")
        .where("id", "=", providerId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

    if (!existing) {
        return Response.json(
            { message: "Provider not found." },
            { status: 404 }
        );
    }

    try {
        const body = (await request.json()) as ProviderUpdateInput;

        const abn =
            typeof body.abn === "string" ? body.abn.trim() : "";

        const name =
            typeof body.name === "string" ? body.name.trim() : "";

        const email =
            typeof body.email === "string" ? body.email.trim() : "";

        const phoneNumber =
            typeof body.phone_number === "string"
                ? body.phone_number.trim()
                : null;

        const address =
            typeof body.address === "string" ? body.address.trim() : "";

        const unitBuilding =
            typeof body.unit_building === "string"
                ? body.unit_building.trim()
                : null;

        const errors: Record<string, string> = {};

        if (!/^\d{1,11}$/.test(abn)) {
            errors.abn =
                "ABN must contain digits only and be no more than 11 digits.";
        }

        if (!name) {
            errors.name = "Provider name is required.";
        }

        if (!email || !isValidEmail(email)) {
            errors.email = "Valid email address is required.";
        }

        if (phoneNumber && !/^\d{3,16}$/.test(phoneNumber)) {
            errors.phone_number =
                "Phone number must contain between 3 and 16 digits.";
        }

        if (!address) {
            errors.address = "Address is required.";
        }

        if (
            typeof body.unit_building === "string" &&
            body.unit_building.length > 0 &&
            !unitBuilding
        ) {
            errors.unit_building =
                "Unit/building must not be empty when provided.";
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

        const provider = await db
            .updateTable("provider")
            .set({
                abn,
                name,
                email,
                phone_number: phoneNumber,
                address,
                unit_building: unitBuilding,
                updated_at: new Date(),
            })
            .where("id", "=", providerId)
            .where("deleted_at", "is", null)
            .returning([
                "id",
                "abn",
                "name",
                "email",
                "phone_number",
                "address",
                "unit_building",
                "updated_at",
            ])
            .executeTakeFirstOrThrow();

        return Response.json({
            data: provider,
        });
    } catch (error) {
        console.error("Update provider failed:", error);

        return Response.json(
            { message: "Unable to update provider." },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const providerId = Number(id);

    if (!Number.isInteger(providerId) || providerId <= 0) {
        return Response.json(
            { message: "Invalid provider ID." },
            { status: 400 }
        );
    }

    const provider = await db
        .updateTable("provider")
        .set({
            deleted_at: new Date(),
            updated_at: new Date(),
        })
        .where("id", "=", providerId)
        .where("deleted_at", "is", null)
        .returning("id")
        .executeTakeFirst();

    if (!provider) {
        return Response.json(
            { message: "Provider not found." },
            { status: 404 }
        );
    }

    return Response.json({
        message: "Provider deleted successfully.",
    });
}

