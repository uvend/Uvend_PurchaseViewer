import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ImagePayload = {
  fileName: string;
  mimeType: string;
  base64: string;
};

type PurchasePayload = {
  shopName: string;
  customShop: boolean;
  cardLabel: string;
  cardBank?: string;
  cardLastFour?: string;
  description: string;
  jobId?: string | null;
  latitude?: number;
  longitude?: number;
  locationStatus?: string;
  slipLabel: string;
  slipImage: ImagePayload;
  itemLabel: string;
  itemImage: ImagePayload;
  ocr?: {
    text: string;
    requestId?: string;
    words?: { text: string; score: number }[];
    imageWidth?: number | null;
    imageHeight?: number | null;
    image: ImagePayload;
  };
};

function imageBytesFromBase64(image: ImagePayload) {
  const base64 = image.base64.includes(",")
    ? image.base64.split(",").at(-1)
    : image.base64;

  if (!base64) {
    throw new Error("Missing image data");
  }

  return Buffer.from(base64, "base64");
}

function getLastFour(cardLabel: string) {
  const digits = cardLabel.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : undefined;
}

function summarizeImage(image?: ImagePayload) {
  if (!image) {
    return null;
  }

  const base64 = image.base64.includes(",")
    ? image.base64.split(",").at(-1)
    : image.base64;

  return {
    fileName: image.fileName,
    mimeType: image.mimeType,
    base64Characters: base64?.length ?? 0,
    estimatedBytes: base64 ? Math.round((base64.length * 3) / 4) : 0,
  };
}

export async function POST(request: Request) {
  try {
    const signedInUser = await requireUser();

    if (!signedInUser) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const payload = (await request.json()) as PurchasePayload;

    console.log("Purchase push received", {
      userId: signedInUser.userId,
      username: signedInUser.username,
      shopName: payload.shopName,
      customShop: payload.customShop,
      cardLabel: payload.cardLabel,
      cardBank: payload.cardBank,
      cardLastFour: payload.cardLastFour ?? getLastFour(payload.cardLabel),
      description: payload.description,
      latitude: payload.latitude,
      longitude: payload.longitude,
      locationStatus: payload.locationStatus,
      slipLabel: payload.slipLabel,
      slipImage: summarizeImage(payload.slipImage),
      itemLabel: payload.itemLabel,
      itemImage: summarizeImage(payload.itemImage),
    });

    if (!payload.shopName || !payload.cardLabel || !payload.description) {
      return NextResponse.json(
        { error: "Shop, card, and description are required" },
        { status: 400 },
      );
    }

    if (!payload.slipImage || !payload.itemImage) {
      return NextResponse.json(
        { error: "Slip and item images are required" },
        { status: 400 },
      );
    }

    if (payload.jobId) {
      const job = await prisma.job.findUnique({
        where: { id: payload.jobId },
        select: { id: true },
      });

      if (!job) {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId: signedInUser.userId,
        shopName: payload.shopName,
        customShop: payload.customShop,
        cardLabel: payload.cardLabel,
        cardBank: payload.cardBank,
        cardLastFour: payload.cardLastFour ?? getLastFour(payload.cardLabel),
        description: payload.description,
        jobId: payload.jobId || null,
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationStatus: payload.locationStatus,
        slipLabel: payload.slipLabel,
        slipImageName: payload.slipImage.fileName,
        slipImageMimeType: payload.slipImage.mimeType,
        slipImageBytes: imageBytesFromBase64(payload.slipImage),
        itemLabel: payload.itemLabel,
        itemImageName: payload.itemImage.fileName,
        itemImageMimeType: payload.itemImage.mimeType,
        itemImageBytes: imageBytesFromBase64(payload.itemImage),
        ocrText: payload.ocr?.text ?? null,
        ocrRequestId: payload.ocr?.requestId || null,
        ocrWords: payload.ocr?.words ?? undefined,
        ocrImageWidth: payload.ocr?.imageWidth ?? null,
        ocrImageHeight: payload.ocr?.imageHeight ?? null,
        ocrImageName: payload.ocr?.image.fileName ?? null,
        ocrImageMimeType: payload.ocr?.image.mimeType ?? null,
        ocrImageBytes: payload.ocr ? imageBytesFromBase64(payload.ocr.image) : null,
      },
      select: {
        id: true,
        shopName: true,
        cardLabel: true,
        description: true,
        purchasedAt: true,
      },
    });

    console.log("Purchase pushed to database", {
      id: purchase.id,
      shopName: purchase.shopName,
      cardLabel: purchase.cardLabel,
      purchasedAt: purchase.purchasedAt,
    });

    return NextResponse.json(
      {
        purchase,
        downloads: {
          slip: `/api/purchases/${purchase.id}/images/slip`,
          item: `/api/purchases/${purchase.id}/images/item`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Could not save purchase" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const user = await requireUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const purchases = await prisma.purchase.findMany({
    where: user.role === "ADMIN" ? undefined : { userId: user.userId },
    orderBy: {
      purchasedAt: "desc",
    },
    select: {
      id: true,
      shopName: true,
      cardLabel: true,
      cardLastFour: true,
      description: true,
      jobId: true,
      latitude: true,
      longitude: true,
      locationStatus: true,
      slipLabel: true,
      slipImageName: true,
      itemLabel: true,
      itemImageName: true,
      ocrText: true,
      ocrRequestId: true,
      ocrWords: true,
      ocrImageWidth: true,
      ocrImageHeight: true,
      ocrImageName: true,
      purchasedAt: true,
      createdAt: true,
      job: {
        select: {
          id: true,
          title: true,
        },
      },
      invoiceItems: {
        select: {
          id: true,
          invoiceId: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return NextResponse.json({
    purchases: purchases.map((purchase) => ({
      ...purchase,
      downloads: {
        slip: `/api/purchases/${purchase.id}/images/slip`,
        item: `/api/purchases/${purchase.id}/images/item`,
        ocr: purchase.ocrImageName ? `/api/purchases/${purchase.id}/images/ocr` : null,
      },
    })),
  });
}
