
import { db } from "../../../lib/db/database";

export async function GET() {
    const participants = await db
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
            "client.ndis_number",
            "client.dob",
            "client.email",
            "client.phone_number",
            "client.address",
            "client.unit_building",
            "client.pricing_region",
            "gender.label as gender",
            "rate_set_support_item_pricing_region.full_label as pricing_region_label",
        ])
        .where("client.deleted_at", "is", null)
        .orderBy("client.last_name", "asc")
        .orderBy("client.first_name", "asc")
        .execute();
        
    return Response.json({
        data: participants,
    });
}

type ParticipantInput = {
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


export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ParticipantInput;

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
                {
                    status: 400,
                }
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
                {
                    status: 400,
                }
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
                {
                    status: 400,
                }
            );
        }

        const participant = await db
            .insertInto("client")
            .values({
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
            })
            .returning([
                "id",
                "first_name",
                "last_name",
                "ndis_number",
                "email",
                "pricing_region",
            ])
            .executeTakeFirstOrThrow();

        return Response.json(
            {
                data: participant,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23505"
        ) {
            return Response.json(
                {
                    message: "Validation failed.",
                    errors: {
                        ndis_number:
                            "A participant with this NDIS number already exists.",
                    },
                },
                {
                    status: 409,
                }
            );
        }

        console.error("Create participant failed:", error);

        return Response.json(
            {
                message: "Unable to create participant.",
            },
            {
                status: 500,
            }
        );
    }
}