import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { importCatalogueToDatabase } from "@/lib/rate-sets/import-catalogue-db";

export const runtime = "nodejs";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const rateSetId = Number(id);

    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
        return Response.json(
            {
                success: false,
                error: "Excel file is required",
            },
            { status: 400 }
        );
    }

    const extension = path
        .extname(uploadedFile.name)
        .toLowerCase();

    // extension validation block
    if (![".xlsx", ".xls"].includes(extension)) {
        return Response.json(
            {
                success: false,
                error: "Only Excel files are supported",
            },
            { status: 400 }
        );
    }
    if (!Number.isInteger(rateSetId) || rateSetId <= 0) {
        return Response.json(
            {
                success: false,
                error: "Invalid rate set ID",
            },
            { status: 400 }
        );
    }

    const tempPath = path.join(
        tmpdir(),
        `${randomUUID()}${extension}`
    );

    const fileBuffer = Buffer.from(
        await uploadedFile.arrayBuffer()
    );

    await writeFile(tempPath, fileBuffer);

    // Attempt success response
    try {
        const result = await importCatalogueToDatabase(
            tempPath,
            rateSetId
        );

        return Response.json({
            success: true,
            data: result,
        });
    } finally {
        await unlink(tempPath).catch(() => { });
    }
}