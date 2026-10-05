import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
    kind: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const { id, kind } = await context.params;

  if (kind !== "slip" && kind !== "item") {
    return NextResponse.json({ error: "Unknown image type" }, { status: 400 });
  }

  const purchase = await prisma.purchase.findUnique({
    where: {
      id,
    },
    select: {
      slipImageBytes: true,
      slipImageMimeType: true,
      slipImageName: true,
      itemImageBytes: true,
      itemImageMimeType: true,
      itemImageName: true,
    },
  });

  if (!purchase) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  const image =
    kind === "slip"
      ? {
          bytes: purchase.slipImageBytes,
          mimeType: purchase.slipImageMimeType,
          fileName: purchase.slipImageName,
        }
      : {
          bytes: purchase.itemImageBytes,
          mimeType: purchase.itemImageMimeType,
          fileName: purchase.itemImageName,
        };

  return new Response(image.bytes, {
    headers: {
      "Content-Disposition": `inline; filename="${image.fileName}"`,
      "Content-Type": image.mimeType,
    },
  });
}
