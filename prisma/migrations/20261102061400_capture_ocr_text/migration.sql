ALTER TABLE "Purchase" ADD COLUMN "ocrText" TEXT,
ADD COLUMN "ocrRequestId" TEXT,
ADD COLUMN "ocrWords" JSONB,
ADD COLUMN "ocrImageWidth" INTEGER,
ADD COLUMN "ocrImageHeight" INTEGER,
ADD COLUMN "ocrImageName" TEXT,
ADD COLUMN "ocrImageMimeType" TEXT,
ADD COLUMN "ocrImageBytes" BYTEA;
