import { db } from "../../../lib/db/database";

export async function GET() {
    const providers = await db
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
        .where("deleted_at", "is", null)
        .orderBy("name", "asc")
        .execute();

    return Response.json({
        data: providers,
    });
}

type ProviderInput = {
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

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ProviderInput;

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
                {
                    status: 400,
                }
            );
        }

        const provider = await db
            .insertInto("provider")
            .values({
                abn,
                name,
                email,
                phone_number: phoneNumber,
                address,
                unit_building: unitBuilding,
            })
            .returning([
                "id",
                "abn",
                "name",
                "email",
                "phone_number",
                "address",
                "unit_building",
            ])
            .executeTakeFirstOrThrow();

        return Response.json(
            {
                data: provider,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error("Create provider failed:", error);

        return Response.json(
            {
                message: "Unable to create provider.",
            },
            {
                status: 500,
            }
        );
    }
}

