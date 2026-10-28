-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN "jobId" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN "purchaseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_purchaseId_key" ON "InvoiceItem"("purchaseId");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
