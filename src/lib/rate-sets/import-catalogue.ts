import * as XLSX from "xlsx";

export function normalizeCatalogueDate(
    value: unknown
): string | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const text = String(value).trim();

    if (!/^\d{8}$/.test(text)) {
        throw new Error(`Invalid catalogue date: ${text}`);
    }

    const year = text.slice(0, 4);
    const month = text.slice(4, 6);
    const day = text.slice(6, 8);

    return `${year}-${month}-${day}`;
}

export function normalizeCatalogueBoolean(
    value: unknown
): boolean {
    if (value === null || value === undefined) {
        return false;
    }

    const text = String(value).trim().toLowerCase();

    return text === "y" || text === "yes";
}

export function normalizeSupportItemTypeCode(
    value: unknown
): string {
    return String(value)
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");
}

export const ATTRIBUTE_COLUMNS = [
    {
        header: "Quote",
        code: "IS_QUOTE_REQUIRED",
    },
    {
        header: "Non-Face-to-Face Support Provision",
        code: "IS_NF2F_SUPPORT_PROVISION",
    },
    {
        header: "Provider Travel",
        code: "IS_PROVIDER_TRAVEL",
    },
    {
        header: "Short Notice Cancellations.",
        code: "IS_SHORT_NOTICE_CANCEL",
    },
    {
        header: "NDIA Requested Reports",
        code: "IS_NDIA_REQUESTED_REPORTS",
    },
    {
        header: "Irregular SIL Supports",
        code: "IS_IRREGULAR_SIL_SUPPORTS",
    },
] as const;

export const PRICING_REGION_COLUMNS = [
    {
        header: "ACT",
        code: "ACT",
        fullLabel: "Australian Capital Territory",
    },
    {
        header: "NSW",
        code: "NSW",
        fullLabel: "New South Wales",
    },
    {
        header: "NT",
        code: "NT",
        fullLabel: "Northern Territory",
    },
    {
        header: "QLD",
        code: "QLD",
        fullLabel: "Queensland",
    },
    {
        header: "SA",
        code: "SA",
        fullLabel: "South Australia",
    },
    {
        header: "TAS",
        code: "TAS",
        fullLabel: "Tasmania",
    },
    {
        header: "VIC",
        code: "VIC",
        fullLabel: "Victoria",
    },
    {
        header: "WA",
        code: "WA",
        fullLabel: "Western Australia",
    },
    {
        header: "Remote",
        code: "REMOTE",
        fullLabel: "Remote",
    },
    {
        header: "Very Remote",
        code: "VERY_REMOTE",
        fullLabel: "Very Remote",
    },
] as const;

export function normalizeCataloguePrice(
    value: unknown
): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    const text = String(value).trim();

    if (!text) {
        return null;
    }

    const price = Number(text);

    if (!Number.isFinite(price)) {
        throw new Error(`Invalid catalogue price: ${text}`);
    }

    return price;
}

export const CATALOGUE_COLUMNS = {
    categoryNumber: "Support Category Number (PACE)",
    categoryName: "Support Category Name (PACE)",
    itemNumber: "Support Item Number",
    itemName: "Support Item Name",
    unit: "Unit",
    startDate: "Start date",
    endDate: "End Date",
    type: "Type",
} as const;

export function readCatalogue(filePath: string) {
    const workbook = XLSX.readFile(filePath);

    const sheets = workbook.SheetNames.map((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            worksheet,
            {
                defval: null,
            }
        );

        const rows = rawRows.map((row) =>
            Object.fromEntries(
                Object.entries(row).map(([key, value]) => [
                    key.trim(),
                    value,
                ])
            )
        );

        return {
            sheetName,
            rows,
        };
    });

    return sheets;
}

export function extractCatalogueCategories(
    sheets: ReturnType<typeof readCatalogue>
) {
    const categories = new Map<string, string>();

    for (const sheet of sheets) {
        for (const row of sheet.rows) {
            const rawNumber = row[CATALOGUE_COLUMNS.categoryNumber];
            const rawName = row[CATALOGUE_COLUMNS.categoryName];

            if (rawNumber === null || rawNumber === undefined) {
                continue;
            }

            if (rawName === null || rawName === undefined) {
                continue;
            }

            const categoryNumber = String(rawNumber).trim();
            const categoryName = String(rawName).trim();

            const existingName = categories.get(categoryNumber);

            if (existingName && existingName !== categoryName) {
                throw new Error(
                    `Conflicting category name for ${categoryNumber}: "${existingName}" vs "${categoryName}"`
                );
            }

            categories.set(categoryNumber, categoryName);
        }
    }

    return [...categories.entries()]
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([categoryNumber, categoryName], index) => ({
            categoryNumber,
            categoryName,
            sorting: index + 1,
        }));
}

