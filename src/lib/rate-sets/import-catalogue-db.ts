import { db } from "../db/database";
import type { Transaction } from "kysely";
import type { Database } from "../db/schema";

import {
    extractCatalogueAttributeTypes,
    extractCatalogueCategories,
    extractCataloguePrices,
    extractCatalogueSupportItemAttributes,
    extractCatalogueSupportItems,
    extractCatalogueSupportItemTypes,
    readCatalogue,
} from "./import-catalogue";

type CatalogueTransaction = Transaction<Database>;

async function syncSupportItemTypes(
    trx: CatalogueTransaction,
    supportItemTypes: ReturnType<
        typeof extractCatalogueSupportItemTypes
    >
) {
    
    for (const itemType of supportItemTypes) {
        const existing = await trx
            .selectFrom("rate_set_support_item_type")
            .select(["id", "label", "deactivated_at"])
            .where("code", "=", itemType.code)
            .executeTakeFirst();

        if (!existing) {
            await trx
                .insertInto("rate_set_support_item_type")
                .values({
                    code: itemType.code,
                    label: itemType.label,
                })
                .execute();

            continue;
        }

        if (
            existing.label !== itemType.label ||
            existing.deactivated_at !== null
        ) {
            await trx
                .updateTable("rate_set_support_item_type")
                .set({
                    label: itemType.label,
                    deactivated_at: null,
                })
                .where("id", "=", existing.id)
                .execute();
        }
    }
}

async function syncAttributeTypes(
    trx: CatalogueTransaction,
    attributeTypes: ReturnType<
        typeof extractCatalogueAttributeTypes
    >
) {
    for (const attributeType of attributeTypes) {
        const existing = await trx
            .selectFrom("rate_set_support_item_attribute_type")
            .select(["code", "label", "deactivated_at"])
            .where("code", "=", attributeType.code)
            .executeTakeFirst();

        if (!existing) {
            await trx
                .insertInto("rate_set_support_item_attribute_type")
                .values({
                    code: attributeType.code,
                    label: attributeType.label,
                })
                .execute();

            continue;
        }

        if (
            existing.label !== attributeType.label ||
            existing.deactivated_at !== null
        ) {
            await trx
                .updateTable("rate_set_support_item_attribute_type")
                .set({
                    label: attributeType.label,
                    deactivated_at: null,
                })
                .where("code", "=", attributeType.code)
                .execute();
        }
    }
}

async function syncCategories(
    trx: CatalogueTransaction,
    rateSetId: number,
    categories: ReturnType<
        typeof extractCatalogueCategories
    >
) {
    const importedCategoryNumbers = new Set(
        categories.map((category) => category.categoryNumber)
    );

    for (const category of categories) {
        const existing = await trx
            .selectFrom("rate_set_category")
            .select([
                "id",
                "category_name",
                "sorting",
                "deactivated_at",
            ])
            .where("rate_set_id", "=", rateSetId)
            .where("category_number", "=", category.categoryNumber)
            .where("deleted_at", "is", null)
            .executeTakeFirst();

        if (!existing) {
            await trx
                .insertInto("rate_set_category")
                .values({
                    rate_set_id: rateSetId,
                    category_number: category.categoryNumber,
                    category_name: category.categoryName,
                    sorting: category.sorting,
                })
                .execute();

            continue;
        }

        if (
            existing.category_name !== category.categoryName ||
            existing.sorting !== category.sorting ||
            existing.deactivated_at !== null
        ) {
            await trx
                .updateTable("rate_set_category")
                .set({
                    category_name: category.categoryName,
                    sorting: category.sorting,
                    deactivated_at: null,
                    updated_at: new Date(),
                })
                .where("id", "=", existing.id)
                .execute();
        }
    }

    const existingCategories = await trx
        .selectFrom("rate_set_category")
        .select(["id", "category_number"])
        .where("rate_set_id", "=", rateSetId)
        .where("deleted_at", "is", null)
        .where("deactivated_at", "is", null)
        .execute();

    for (const existing of existingCategories) {
        if (!importedCategoryNumbers.has(existing.category_number)) {
            await trx
                .updateTable("rate_set_category")
                .set({
                    deactivated_at: new Date(),
                    updated_at: new Date(),
                })
                .where("id", "=", existing.id)
                .execute();
        }
    }

}

async function syncSupportItems(
    trx: CatalogueTransaction,
    rateSetId: number,
    supportItems: ReturnType<
        typeof extractCatalogueSupportItems
    >
) {
    const importedSupportItemKeys = new Set(
        supportItems.map(
            (item) => `${item.categoryNumber}|${item.itemNumber}`
        )
    );

    const categoryRows = await trx
        .selectFrom("rate_set_category")
        .select(["id", "category_number"])
        .where("rate_set_id", "=", rateSetId)
        .where("deleted_at", "is", null)
        .execute();

    const categoryIdByNumber = new Map(
        categoryRows.map((category) => [
            category.category_number,
            category.id,
        ])
    );

    const categoryNumberById = new Map(
        categoryRows.map((category) => [
            category.id,
            category.category_number,
        ])
    );

    for (const supportItem of supportItems) {
        const categoryId = categoryIdByNumber.get(
            supportItem.categoryNumber
        );

        if (!categoryId) {
            throw new Error(
                `Category ${supportItem.categoryNumber} not found`
            );
        }

        const existing = await trx
            .selectFrom("rate_set_support_item")
            .select([
                "id",
                "item_name",
                "unit",
                "sorting",
                "deactivated_at",
            ])
            .where("rate_set_id", "=", rateSetId)
            .where("category_id", "=", categoryId)
            .where("item_number", "=", supportItem.itemNumber)
            .where("deleted_at", "is", null)
            .executeTakeFirst();

        if (!existing) {
            await trx
                .insertInto("rate_set_support_item")
                .values({
                    rate_set_id: rateSetId,
                    category_id: categoryId,
                    item_number: supportItem.itemNumber,
                    item_name: supportItem.itemName,
                    unit: supportItem.unit,
                    sorting: supportItem.sorting,
                })
                .execute();

            continue;
        }

        if (
            existing.item_name !== supportItem.itemName ||
            existing.unit !== supportItem.unit ||
            existing.sorting !== supportItem.sorting ||
            existing.deactivated_at !== null
        ) {
            await trx
                .updateTable("rate_set_support_item")
                .set({
                    item_name: supportItem.itemName,
                    unit: supportItem.unit,
                    sorting: supportItem.sorting,
                    deactivated_at: null,
                    updated_at: new Date(),
                })
                .where("id", "=", existing.id)
                .execute();
        }
    }

    const existingSupportItems = await trx
        .selectFrom("rate_set_support_item")
        .select([
            "id",
            "category_id",
            "item_number",
        ])
        .where("rate_set_id", "=", rateSetId)
        .where("deleted_at", "is", null)
        .where("deactivated_at", "is", null)
        .execute();

    for (const existing of existingSupportItems) {
        const categoryNumber =
            categoryNumberById.get(existing.category_id);

        if (!categoryNumber) {
            throw new Error(
                `Category ${existing.category_id} not found`
            );
        }

        const key =
            `${categoryNumber}|${existing.item_number}`;

        if (!importedSupportItemKeys.has(key)) {
            await trx
                .updateTable("rate_set_support_item")
                .set({
                    deactivated_at: new Date(),
                    updated_at: new Date(),
                })
                .where("id", "=", existing.id)
                .execute();
        }
    }

}

async function syncSupportItemAttributes(
    trx: CatalogueTransaction,
    rateSetId: number,
    attributes: ReturnType<
        typeof extractCatalogueSupportItemAttributes
    >
) {
    const categories = await trx
        .selectFrom("rate_set_category")
        .select(["id", "category_number"])
        .where("rate_set_id", "=", rateSetId)
        .where("deleted_at", "is", null)
        .execute();

    const categoryIdByNumber = new Map(
        categories.map((category) => [
            category.category_number,
            category.id,
        ])
    );

    const supportItems = await trx
        .selectFrom("rate_set_support_item")
        .select(["id", "category_id", "item_number"])
        .where("rate_set_id", "=", rateSetId)
        .where("deleted_at", "is", null)
        .execute();

    const supportItemIdByKey = new Map(
        supportItems.map((item) => [
            `${item.category_id}|${item.item_number}`,
            item.id,
        ])
    );

    for (const attribute of attributes) {
        const categoryId = categoryIdByNumber.get(
            attribute.categoryNumber
        );

        if (!categoryId) {
            throw new Error(
                `Category ${attribute.categoryNumber} not found`
            );
        }

        const supportItemId = supportItemIdByKey.get(
            `${categoryId}|${attribute.itemNumber}`
        );

        if (!supportItemId) {
            throw new Error(
                `Support item ${attribute.itemNumber} not found`
            );
        }

        const existing = await trx
            .selectFrom("rate_set_support_item_attribute")
            .select(["id", "value"])
            .where("support_item_id", "=", supportItemId)
            .where("attribute_code", "=", attribute.attributeCode)
            .executeTakeFirst();

        if (!existing) {
            await trx
                .insertInto("rate_set_support_item_attribute")
                .values({
                    support_item_id: supportItemId,
                    attribute_code: attribute.attributeCode,
                    value: attribute.value,
                })
                .execute();

            continue;
        }

        if (existing.value !== attribute.value) {
            await trx
                .updateTable("rate_set_support_item_attribute")
                .set({
                    value: attribute.value,
                })
                .where("id", "=", existing.id)
                .execute();
        }
    }
}

function makePriceKey(
    supportItemId: number,
    typeId: number | null,
    pricingRegionCode: string,
    startDate: string,
    endDate: string | null
) {
    return [
        supportItemId,
        typeId ?? "NULL",
        pricingRegionCode,
        startDate,
        endDate ?? "NULL",
    ].join("|");
}

function timestampToDateKey(
    value: Date | string
): string {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    return String(value).slice(0, 10);
}

async function syncPrices(
    trx: CatalogueTransaction,
    rateSetId: number,
    prices: ReturnType<typeof extractCataloguePrices>
) {
    const categories = await trx
        .selectFrom("rate_set_category")
        .select(["id", "category_number"])
        .where("rate_set_id", "=", rateSetId)
        .where("deleted_at", "is", null)
        .execute();

    const categoryIdByNumber = new Map(
        categories.map((category) => [
            category.category_number,
            category.id,
        ])
    );

    const supportItems = await trx
        .selectFrom("rate_set_support_item")
        .select(["id", "category_id", "item_number"])
        .where("rate_set_id", "=", rateSetId)
        .where("deleted_at", "is", null)
        .execute();

    const supportItemIdByKey = new Map(
        supportItems.map((item) => [
            `${item.category_id}|${item.item_number}`,
            item.id,
        ])
    );

    const itemTypes = await trx
        .selectFrom("rate_set_support_item_type")
        .select(["id", "code"])
        .execute();

    const typeIdByCode = new Map(
        itemTypes.map((type) => [
            type.code,
            type.id,
        ])
    );

    const existingPrices = await trx
        .selectFrom("rate_set_support_item_price")
        .select([
            "id",
            "support_item_id",
            "type_id",
            "pricing_region_code",
            "unit_price",
            "start_date",
            "end_date",
            "deleted_at",
        ])
        .where("rate_set_id", "=", rateSetId)
        .execute();

    const existingPriceByKey = new Map<
        string,
        (typeof existingPrices)[number]
    >();

    for (const existing of existingPrices) {
        if (!existing.pricing_region_code) {
            continue;
        }

        const key = makePriceKey(
            existing.support_item_id,
            existing.type_id,
            existing.pricing_region_code,
            timestampToDateKey(existing.start_date),
            existing.end_date
                ? timestampToDateKey(existing.end_date)
                : null
        );

        existingPriceByKey.set(key, existing);
    }

    const importedPriceKeys = new Set<string>();

    for (const price of prices) {
        const categoryId = categoryIdByNumber.get(
            price.categoryNumber
        );

        if (!categoryId) {
            throw new Error(
                `Category ${price.categoryNumber} not found`
            );
        }

        const supportItemId = supportItemIdByKey.get(
            `${categoryId}|${price.itemNumber}`
        );

        if (!supportItemId) {
            throw new Error(
                `Support item ${price.itemNumber} not found`
            );
        }

        const typeId =
            price.typeCode === null
                ? null
                : typeIdByCode.get(price.typeCode);

        if (
            price.typeCode !== null &&
            typeId === undefined
        ) {
            throw new Error(
                `Support item type ${price.typeCode} not found`
            );
        }

        const key = makePriceKey(
            supportItemId,
            typeId ?? null,
            price.pricingRegionCode,
            price.startDate,
            price.endDate
        );

        importedPriceKeys.add(key);

        const existing = existingPriceByKey.get(key);

        if (!existing) {
            await trx
                .insertInto("rate_set_support_item_price")
                .values({
                    rate_set_id: rateSetId,
                    support_item_id: supportItemId,
                    type_id: typeId ?? null,
                    pricing_region_code: price.pricingRegionCode,
                    unit_price: price.unitPrice,
                    start_date: new Date(
                        `${price.startDate}T00:00:00.000Z`
                    ),
                    end_date: price.endDate
                        ? new Date(
                            `${price.endDate}T00:00:00.000Z`
                        )
                        : null,
                })
                .execute();

            continue;
        }

        const existingUnitPrice =
            existing.unit_price === null
                ? null
                : Number(existing.unit_price);

        if (existingUnitPrice !== price.unitPrice ||
            existing.deleted_at !== null) {
            await trx
                .updateTable("rate_set_support_item_price")
                .set({
                    unit_price: price.unitPrice,
                    deleted_at: null,
                    updated_at: new Date(),
                })
                .where("id", "=", existing.id)
                .execute();
        }
    }

    for (const [key, existing] of existingPriceByKey) {
        if (
            existing.deleted_at === null &&
            !importedPriceKeys.has(key)
        ) {
            await trx
                .updateTable("rate_set_support_item_price")
                .set({
                    deleted_at: new Date(),
                    updated_at: new Date(),
                })
                .where("id", "=", existing.id)
                .execute();
        }
    }

}

export async function importCatalogueToDatabase(
    filePath: string,
    rateSetId: number
) {
    if (!Number.isInteger(rateSetId) || rateSetId <= 0) {
        throw new Error("Invalid rate set ID");
    }

    const rateSet = await db
        .selectFrom("rate_set")
        .select(["id", "name"])
        .where("id", "=", rateSetId)
        .where("deleted_at", "is", null)
        .executeTakeFirst();

    if (!rateSet) {
        throw new Error(`Rate set ${rateSetId} not found`);
    }

    const sheets = readCatalogue(filePath);
    const categories = extractCatalogueCategories(sheets);
    const supportItems = extractCatalogueSupportItems(sheets);
    const supportItemTypes = extractCatalogueSupportItemTypes(sheets);
    const attributeTypes = extractCatalogueAttributeTypes();
    const attributes = extractCatalogueSupportItemAttributes(sheets);
    const prices = extractCataloguePrices(sheets);

    return db.transaction().execute(async (trx) => {

        await syncCategories(trx, rateSetId, categories);
        await syncSupportItems(trx, rateSetId, supportItems);
        await syncSupportItemTypes(trx, supportItemTypes);
        await syncAttributeTypes(trx, attributeTypes);
        await syncSupportItemAttributes(trx, rateSetId, attributes);
        await syncPrices(trx, rateSetId, prices);

        return {
            rateSet,
            counts: {
                sheets: sheets.length,
                categories: categories.length,
                supportItems: supportItems.length,
                supportItemTypes: supportItemTypes.length,
                attributeTypes: attributeTypes.length,
                attributes: attributes.length,
                prices: prices.length,
            },
        };
    });
}

