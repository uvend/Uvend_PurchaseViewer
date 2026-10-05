-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "customShop" BOOLEAN NOT NULL DEFAULT false,
    "cardLabel" TEXT NOT NULL,
    "cardBank" TEXT,
    "cardLastFour" TEXT,
    "description" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "slipImageUrl" TEXT NOT NULL,
    "slipImageName" TEXT,
    "itemImageUrl" TEXT NOT NULL,
    "itemImageName" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);
