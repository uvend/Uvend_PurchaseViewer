/*
  Warnings:

  - You are about to drop the column `itemImageUrl` on the `Purchase` table. All the data in the column will be lost.
  - You are about to drop the column `slipImageUrl` on the `Purchase` table. All the data in the column will be lost.
  - Added the required column `itemImageBytes` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemImageMimeType` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemLabel` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slipImageBytes` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slipImageMimeType` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slipLabel` to the `Purchase` table without a default value. This is not possible if the table is not empty.
  - Made the column `slipImageName` on table `Purchase` required. This step will fail if there are existing NULL values in that column.
  - Made the column `itemImageName` on table `Purchase` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INSTALLER', 'ADMIN');

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "itemImageUrl",
DROP COLUMN "slipImageUrl",
ADD COLUMN     "itemImageBytes" BYTEA NOT NULL,
ADD COLUMN     "itemImageMimeType" TEXT NOT NULL,
ADD COLUMN     "itemLabel" TEXT NOT NULL,
ADD COLUMN     "locationStatus" TEXT,
ADD COLUMN     "slipImageBytes" BYTEA NOT NULL,
ADD COLUMN     "slipImageMimeType" TEXT NOT NULL,
ADD COLUMN     "slipLabel" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "slipImageName" SET NOT NULL,
ALTER COLUMN "itemImageName" SET NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'INSTALLER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
