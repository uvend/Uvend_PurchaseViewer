-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "role" "UserRole",
    "success" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
