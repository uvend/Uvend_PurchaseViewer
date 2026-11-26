CREATE TABLE "CompanyCard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyCard_pkey" PRIMARY KEY ("id")
);
