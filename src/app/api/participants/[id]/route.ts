import { db } from "../../../../lib/db/database";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const participantId = Number(id);

    if (!Number.isInteger(participantId) || participantId <= 0) {
        return Response.json(
            {
                message: "Invalid participant ID.",
            },
            {
                status: 400,
            }
        );
    }

    const participant = await db
        .selectFrom("client")
        .leftJoin("gender", "gender.id", "client.gender_id")
        .leftJoin(
            "rate_set_support_item_pricing_region",
            "rate_set_support_item_pricing_region.code",
            "client.pricing_region"
        )
        .select([
            "client.id",
            "client.first_name",
            "client.last_name",
            "client.gender_id",
            "client.dob",
            "client.ndis_number",
            "client.email",
            "client.phone_number",
            "client.address",
            "client.unit_building",
            "client.pricing_region",
            "gender.label as gender",
            "rate_set_support_item_pricing_region.full_label as pricing_region_label",
            "client.created_at",
            "client.updated_at",
        ])
        .where("client.id", "=", participantId)
        .where("client.deleted_at", "is", null)
        .executeTakeFirst();

    if (!participant) {
        return Response.json(
            {
                message: "Participant not found.",
            },
            {
                status: 404,
            }
        );
    }

    return Response.json({
        data: participant,
    });
}

type ParticipantUpdateInput = {
    first_name?: unknown;
    last_name?: unknown;
    gender_id?: unknown;
    dob?: unknown;
    ndis_number?: unknown;
    email?: unknown;
    phone_number?: unknown;
    address?: unknown;
    unit_building?: unknown;
    pricing_region?: unknown;
};

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const participantId = Number(id);

    if (!Number.isInteger(participantId) || participantId <= 0) {
        return Response.json(
            { message: "Invalid participant ID." },
            { status: 400 }
        );
    }

    const existing = await db
        .selectFrom("client")
        .select("id")
        .where("id", "=", participantId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

    if (!existing) {
        return Response.json(
            { message: "Participant not found." },
            { status: 404 }
        );
    }

    try {
        const body = (await request.json()) as ParticipantUpdateInput;

        const firstName =
            typeof body.first_name === "string" ? body.first_name.trim() : "";

        const lastName =
            typeof body.last_name === "string" ? body.last_name.trim() : "";

        const ndisNumber =
            typeof body.ndis_number === "string" ? body.ndis_number.trim() : "";

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

        const pricingRegion =
            typeof body.pricing_region === "string"
                ? body.pricing_region.trim()
                : "";

        const dob =
            typeof body.dob === "string" ? body.dob.trim() : "";

        const genderId =
            typeof body.gender_id === "number"
                ? body.gender_id
                : Number(body.gender_id);

        const errors: Record<string, string> = {};

        if (!firstName) {
            errors.first_name = "First name is required.";
        }

        if (!lastName) {
            errors.last_name = "Last name is required.";
        }

        if (!Number.isInteger(genderId) || genderId <= 0) {
            errors.gender_id = "Gender is required.";
        }

        if (!dob || Number.isNaN(Date.parse(dob))) {
            errors.dob = "Valid date of birth is required.";
        }

        if (!/^\d{1,16}$/.test(ndisNumber)) {
            errors.ndis_number =
                "NDIS number must contain digits only and be no more than 16 digits.";
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

        if (!pricingRegion) {
            errors.pricing_region = "Pricing region is required.";
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

        const gender = await db
            .selectFrom("gender")
            .select("id")
            .where("id", "=", genderId)
            .where("deactivated_at", "is", null)
            .executeTakeFirst();

        if (!gender) {
            return Response.json(
                {
                    message: "Validation failed.",
                    errors: {
                        gender_id: "Selected gender does not exist.",
                    },
                },
                { status: 400 }
            );
        }

        const region = await db
            .selectFrom("rate_set_support_item_pricing_region")
            .select("code")
            .where("code", "=", pricingRegion)
            .where("deactivated_at", "is", null)
            .executeTakeFirst();

        if (!region) {
            return Response.json(
                {
                    message: "Validation failed.",
                    errors: {
                        pricing_region: "Selected pricing region does not exist.",
                    },
                },
                { status: 400 }
            );
        }

        const participant = await db
            .updateTable("client")
            .set({
                first_name: firstName,
                last_name: lastName,
                gender_id: genderId,
                dob,
                ndis_number: ndisNumber,
                email,
                phone_number: phoneNumber,
                address,
                unit_building: unitBuilding,
                pricing_region: pricingRegion,
                updated_at: new Date(),
            })
            .where("id", "=", participantId)
            .where("deleted_at", "is", null)
            .returning([
                "id",
                "first_name",
                "last_name",
                "ndis_number",
                "email",
                "pricing_region",
                "updated_at",
            ])
            .executeTakeFirstOrThrow();

        return Response.json({
            data: participant,
        });
    } catch (error) {
        console.error("Update participant failed:", error);

        return Response.json(
            {
                message: "Unable to update participant.",
            },
            {
                status: 500,
            }
        );
    }
}


export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const participantId = Number(id);

    if (!Number.isInteger(participantId) || participantId <= 0) {
        return Response.json(
            { message: "Invalid participant ID." },
            { status: 400 }
        );
    }

    const participant = await db
        .updateTable("client")
        .set({
            deleted_at: new Date(),
            updated_at: new Date(),
        })
        .where("id", "=", participantId)
        .where("deleted_at", "is", null)
        .returning("id")
        .executeTakeFirst();

    if (!participant) {
        return Response.json(
            { message: "Participant not found." },
            { status: 404 }
        );
    }

    return Response.json({
        message: "Participant deleted successfully.",
    });
}