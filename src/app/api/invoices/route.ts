import { db } from "@/lib/db/database";
import BigNumber from "bignumber.js";

type InvoiceInput = {
    client_id?: unknown;
    provider_id?: unknown;
    invoice_number?: unknown;
    invoice_date?: unknown;
    expected_amount?: unknown;
    status?: unknown;
    items?: unknown;
};

type InvoiceItemInput = {
    rate_set_id?: unknown;
    category_id?: unknown;
    support_item_id?: unknown;
    start_date?: unknown;
    end_date?: unknown;
    unit?: unknown;
    input_rate?: unknown;
};

type PreparedInvoiceItem = {
    rateSetId: number | null;
    categoryId: number | null;
    supportItemId: number | null;
    startDate: string | null;
    endDate: string | null;
    maxRate: BigNumber | null;
    unit: BigNumber | null;
    inputRate: BigNumber | null;
    amount: BigNumber | null;
    sortOrder: number;
};

function parseDecimal(value: unknown): BigNumber | null {
    if (
        typeof value !== "number" &&
        typeof value !== "string"
    ) {
        return null;
    }

    const text = String(value).trim();

    if (!text) {
        return null;
    }

    const number = new BigNumber(text);

    return number.isFinite() ? number : null;
}

function calculateItemAmount(
    unit: BigNumber,
    inputRate: BigNumber
): BigNumber {
    const roundedInputRate = inputRate.decimalPlaces(
        2,
        BigNumber.ROUND_HALF_UP
    );

    return unit
        .multipliedBy(roundedInputRate)
        .decimalPlaces(2, BigNumber.ROUND_HALF_UP);
}

function decimalForDatabase(
    value: BigNumber | null,
    decimalPlaces?: number
): string | null {
    if (!value) {
        return null;
    }

    return decimalPlaces === undefined
        ? value.toString()
        : value.toFixed(decimalPlaces);
}

function parsePositiveInteger(value: unknown): number | null {
    const number =
        typeof value === "number"
            ? value
            : typeof value === "string" && value.trim() !== ""
                ? Number(value)
                : NaN;

    return Number.isInteger(number) && number > 0
        ? number
        : null;
}

function parseDateOnly(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const text = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return null;
    }

    const date = new Date(`${text}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== text
    ) {
        return null;
    }

    return text;
}

function startOfDayUtc(date: string): Date {
    return new Date(`${date}T00:00:00.000Z`);
}

function endOfDayUtc(date: string): Date {
    return new Date(`${date}T23:59:59.999Z`);
}

async function findOverlappingRateSets(
    startDate: string,
    endDate: string
) {
    const start = startOfDayUtc(startDate);
    const end = endOfDayUtc(endDate);

    return db
        .selectFrom("rate_set")
        .select(["id", "name"])
        .where("deleted_at", "is", null)
        .where("start_date", "<=", end)
        .where((eb) =>
            eb.or([
                eb("end_date", "is", null),
                eb("end_date", ">=", start),
            ])
        )
        .execute();
}

async function supportItemBelongsToSelection(
    rateSetId: number,
    categoryId: number,
    supportItemId: number
): Promise<boolean> {
    const supportItem = await db
        .selectFrom("rate_set_support_item")
        .select("id")
        .where("id", "=", supportItemId)
        .where("rate_set_id", "=", rateSetId)
        .where("category_id", "=", categoryId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

    return Boolean(supportItem);
}

async function getClientPricingRegion(
    clientId: number
): Promise<string | null> {
    const client = await db
        .selectFrom("client")
        .select("pricing_region")
        .where("id", "=", clientId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

    return client?.pricing_region ?? null;
}

async function findMaxRate(
    rateSetId: number,
    supportItemId: number,
    pricingRegion: string,
    startDate: string,
    endDate: string
): Promise<BigNumber | null> {
    const start = startOfDayUtc(startDate);
    const end = endOfDayUtc(endDate);

    const prices = await db
        .selectFrom("rate_set_support_item_price")
        .select([
            "id",
            "unit_price",
            "start_date",
            "end_date",
        ])
        .where("rate_set_id", "=", rateSetId)
        .where("support_item_id", "=", supportItemId)
        .where("pricing_region_code", "=", pricingRegion)
        .where("deleted_at", "is", null)
        .where("unit_price", "is not", null)
        .where("start_date", "<=", end)
        .where((eb) =>
            eb.or([
                eb("end_date", "is", null),
                eb("end_date", ">=", start),
            ])
        )
        .execute();

    prices.sort((a, b) => {
        const startDifference =
            new Date(b.start_date).getTime() -
            new Date(a.start_date).getTime();

        if (startDifference !== 0) {
            return startDifference;
        }

        const aEnd = a.end_date
            ? new Date(a.end_date).getTime()
            : Number.NEGATIVE_INFINITY;

        const bEnd = b.end_date
            ? new Date(b.end_date).getTime()
            : Number.NEGATIVE_INFINITY;

        if (bEnd !== aEnd) {
            return bEnd - aEnd;
        }

        return b.id - a.id;
    });

    const selectedPrice = prices[0];

    if (!selectedPrice || selectedPrice.unit_price === null) {
        return null;
    }

    return new BigNumber(selectedPrice.unit_price);
}

function validateInvoiceItemInput(
    item: InvoiceItemInput,
    index: number
): Record<string, string> {
    const errors: Record<string, string> = {};

    const rateSetId = parsePositiveInteger(item.rate_set_id);
    const categoryId = parsePositiveInteger(item.category_id);
    const supportItemId = parsePositiveInteger(item.support_item_id);
    const startDate = parseDateOnly(item.start_date);
    const endDate = parseDateOnly(item.end_date);
    const unit = parseDecimal(item.unit);
    const inputRate = parseDecimal(item.input_rate);

    if (!rateSetId) {
        errors[`items.${index}.rate_set_id`] = "Rate set is required.";
    }

    if (!categoryId) {
        errors[`items.${index}.category_id`] = "Category is required.";
    }

    if (!supportItemId) {
        errors[`items.${index}.support_item_id`] = "Support item is required.";
    }

    if (!startDate) {
        errors[`items.${index}.start_date`] = "Valid start date is required.";
    }

    if (!endDate) {
        errors[`items.${index}.end_date`] = "Valid end date is required.";
    }

    if (startDate && endDate && startDate > endDate) {
        errors[`items.${index}.end_date`] =
            "End date must be on or after the start date.";
    }

    if (!unit || unit.isNegative()) {
        errors[`items.${index}.unit`] = "Valid unit is required.";
    }

    if (!inputRate || inputRate.isNegative()) {
        errors[`items.${index}.input_rate`] =
            "Valid input rate is required.";
    }

    return errors;
}

export async function GET() {
    const invoices = await db
        .selectFrom("invoice")
        .select([
            "id",
            "client_id",
            "provider_id",
            "invoice_number",
            "invoice_date",
            "amount",
            "expected_amount",
            "status",
            "created_at",
            "updated_at",
        ])
        .where("deleted_at", "is", null)
        .orderBy("id", "desc")
        .execute();

    return Response.json({
        success: true,
        data: invoices,
    });
}

export async function POST(request: Request) {
    const body = (await request.json()) as InvoiceInput;

    const status =
        body.status === "completed"
            ? "completed"
            : body.status === "drafted"
                ? "drafted"
                : null;

    const invoiceNumber =
        typeof body.invoice_number === "string"
            ? body.invoice_number.trim()
            : "";

    const invoiceDate =
        typeof body.invoice_date === "string"
            ? body.invoice_date.trim()
            : "";

    const expectedAmount = parseDecimal(body.expected_amount);

    const clientId =
        typeof body.client_id === "number"
            ? body.client_id
            : typeof body.client_id === "string" &&
                body.client_id.trim() !== ""
                ? Number(body.client_id)
                : null;

    const providerId =
        typeof body.provider_id === "number"
            ? body.provider_id
            : typeof body.provider_id === "string" &&
                body.provider_id.trim() !== ""
                ? Number(body.provider_id)
                : null;

    const items: InvoiceItemInput[] = Array.isArray(body.items)
        ? (body.items as InvoiceItemInput[])
        : [];

    // minimum draft validation
    const errors: Record<string, string> = {};

    if (!invoiceNumber) {
        errors.invoice_number = "Invoice number is required.";
    }

    if (!invoiceDate || !parseDateOnly(invoiceDate)) {
        errors.invoice_date = "Valid invoice date is required.";
    }

    if (!expectedAmount) {
        errors.expected_amount = "Expected amount is required.";
    }

    let calculatedInvoiceAmount = new BigNumber(0);
    const preparedItems: PreparedInvoiceItem[] = [];

    if (status === "completed") {
        // Client required check
        if (!Number.isInteger(clientId) || clientId! <= 0) {
            errors.client_id = "Client is required.";
        }

        if (Number.isInteger(clientId) && clientId! > 0) {
            const client = await db
                .selectFrom("client")
                .select("id")
                .where("id", "=", clientId!)
                .where("deleted_at", "is", null)
                .executeTakeFirst();

            if (!client) {
                errors.client_id = "Client not found.";
            }
        }

        // Provider required check
        if (!Number.isInteger(providerId) || providerId! <= 0) {
            errors.provider_id = "Provider is required.";
        }

        if (Number.isInteger(providerId) && providerId! > 0) {
            const provider = await db
                .selectFrom("provider")
                .select("id")
                .where("id", "=", providerId!)
                .where("deleted_at", "is", null)
                .executeTakeFirst();

            if (!provider) {
                errors.provider_id = "Provider not found.";
            }
        }

        // fetch the participant’s pricing region once per completed invoice
        const clientPricingRegion =
            clientId && Number.isInteger(clientId)
                ? await getClientPricingRegion(clientId)
                : null;

        // Invoice required item check
        if (items.length === 0) {
            errors.items = "At least one invoice item is required.";
        }

        for (let index = 0; index < items.length; index += 1) {
            Object.assign(
                errors,
                validateInvoiceItemInput(items[index], index)
            );

            const item = items[index];

            const rateSetId = parsePositiveInteger(item.rate_set_id);
            const startDate = parseDateOnly(item.start_date);
            const endDate = parseDateOnly(item.end_date);

            // Rate set overlap validation
            if (rateSetId && startDate && endDate && startDate <= endDate) {
                const matchingRateSets = await findOverlappingRateSets(
                    startDate,
                    endDate
                );

                if (matchingRateSets.length === 0) {
                    errors[`items.${index}.rate_set_id`] =
                        "No rate set matches the selected service date range.";
                } else if (matchingRateSets.length > 1) {
                    errors[`items.${index}.rate_set_id`] =
                        "Multiple rate sets match the selected service date range.";
                } else if (matchingRateSets[0].id !== rateSetId) {
                    errors[`items.${index}.rate_set_id`] =
                        "Selected rate set does not match the service date range.";
                }
            }

            // category/support-item validation
            const categoryId = parsePositiveInteger(item.category_id);
            const supportItemId = parsePositiveInteger(item.support_item_id);
            let derivedMaxRate: BigNumber | null = null;

            if (
                rateSetId &&
                categoryId &&
                supportItemId
            ) {
                const validSelection =
                    await supportItemBelongsToSelection(
                        rateSetId,
                        categoryId,
                        supportItemId
                    );

                if (!validSelection) {
                    errors[`items.${index}.support_item_id`] =
                        "Support item does not belong to the selected category and rate set.";
                }
            }

            if (
                rateSetId &&
                supportItemId &&
                startDate &&
                endDate &&
                clientPricingRegion
            ) {
                derivedMaxRate = await findMaxRate(
                    rateSetId,
                    supportItemId,
                    clientPricingRegion,
                    startDate,
                    endDate
                );

                if (!derivedMaxRate) {
                    errors[`items.${index}.max_rate`] =
                        "No matching NDIS price was found for this invoice item.";
                }
            }

            // existing item amount calculations
            const unit = parseDecimal(item.unit);
            const inputRate = parseDecimal(item.input_rate);

            if (unit && inputRate) {
                const itemAmount = calculateItemAmount(
                    unit,
                    inputRate
                );

                calculatedInvoiceAmount =
                    calculatedInvoiceAmount.plus(itemAmount);
            }

            const itemAmount =
                unit && inputRate
                    ? calculateItemAmount(unit, inputRate)
                    : null;

            preparedItems.push({
                rateSetId,
                categoryId,
                supportItemId,
                startDate,
                endDate,
                maxRate: derivedMaxRate,
                unit,
                inputRate,
                amount: itemAmount,
                sortOrder: index,
            });
        }

        if (
            expectedAmount &&
            !expectedAmount.eq(calculatedInvoiceAmount)
        ) {
            errors.expected_amount =
                `Expected amount must equal calculated invoice amount ${calculatedInvoiceAmount.toFixed(2)}.`;
        }

    }

    if (status === "drafted") {
        for (let index = 0; index < items.length; index += 1) {
            const item = items[index];

            const rateSetId = parsePositiveInteger(item.rate_set_id);
            const categoryId = parsePositiveInteger(item.category_id);
            const supportItemId = parsePositiveInteger(item.support_item_id);
            const startDate = parseDateOnly(item.start_date);
            const endDate = parseDateOnly(item.end_date);
            const unit = parseDecimal(item.unit);
            const inputRate = parseDecimal(item.input_rate);

            const itemAmount =
                unit && inputRate
                    ? calculateItemAmount(unit, inputRate)
                    : null;

            if (itemAmount) {
                calculatedInvoiceAmount =
                    calculatedInvoiceAmount.plus(itemAmount);
            }

            preparedItems.push({
                rateSetId,
                categoryId,
                supportItemId,
                startDate,
                endDate,
                maxRate: null,
                unit,
                inputRate,
                amount: itemAmount,
                sortOrder: index,
            });
        }
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
    
    if (!status) {
        return Response.json(
            {
                message: "Validation failed.",
                errors: {
                    status: "Status must be drafted or completed.",
                },
            },
            { status: 400 }
        );
    }

    // try success response
    try {
        const invoice = await db.transaction().execute(async (trx) => {
            const createdInvoice = await trx
                .insertInto("invoice")
                .values({
                    client_id:
                        Number.isInteger(clientId) && clientId! > 0
                            ? clientId
                            : null,
                    provider_id:
                        Number.isInteger(providerId) && providerId! > 0
                            ? providerId
                            : null,
                    invoice_number: invoiceNumber,
                    invoice_date: invoiceDate,
                    amount:
                        preparedItems.some((item) => item.amount !== null)
                            ? decimalForDatabase(calculatedInvoiceAmount, 2)
                            : null,
                    expected_amount:
                        decimalForDatabase(expectedAmount, 2),
                    status,
                })
                .returning([
                    "id",
                    "client_id",
                    "provider_id",
                    "invoice_number",
                    "invoice_date",
                    "amount",
                    "expected_amount",
                    "status",
                    "created_at",
                ])
                .executeTakeFirstOrThrow();

            const createdItems =
                preparedItems.length > 0
                    ? await trx
                        .insertInto("invoice_item")
                        .values(
                            preparedItems.map((item) => ({
                                invoice_id: createdInvoice.id,
                                rate_set_id: item.rateSetId,
                                category_id: item.categoryId,
                                support_item_id: item.supportItemId,
                                start_date: item.startDate
                                    ? startOfDayUtc(item.startDate)
                                    : null,
                                end_date: item.endDate
                                    ? endOfDayUtc(item.endDate)
                                    : null,
                                max_rate: decimalForDatabase(
                                    item.maxRate,
                                    2
                                ),
                                unit: decimalForDatabase(item.unit),
                                input_rate: decimalForDatabase(
                                    item.inputRate,
                                    2
                                ),
                                amount: decimalForDatabase(
                                    item.amount,
                                    2
                                ),
                                sort_order: item.sortOrder,
                            }))
                        )
                        .returning([
                            "id",
                            "rate_set_id",
                            "category_id",
                            "support_item_id",
                            "start_date",
                            "end_date",
                            "max_rate",
                            "unit",
                            "input_rate",
                            "amount",
                            "sort_order",
                        ])
                        .execute()
                    : [];

            return {
                ...createdInvoice,
                items: createdItems,
            };
        });

        return Response.json(
            {
                success: true,
                data: invoice,
            },
            { status: 201 }
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
                    message:
                        "Invoice number already exists for this provider.",
                },
                { status: 409 }
            );
        }

        console.error("Create invoice failed:", error);

        return Response.json(
            {
                message: "Unable to create invoice.",
            },
            { status: 500 }
        );
    }
}

