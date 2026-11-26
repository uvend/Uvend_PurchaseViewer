CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'OFFICE_USER', 'ROAD_USER');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE "role"::text
      WHEN 'ADMIN' THEN 'ADMIN'
      ELSE 'ROAD_USER'
    END
  )::"UserRole_new";

ALTER TABLE "LoginEvent"
  ALTER COLUMN "role" TYPE "UserRole_new"
  USING (
    CASE
      WHEN "role" IS NULL THEN NULL
      WHEN "role"::text = 'ADMIN' THEN 'ADMIN'
      ELSE 'ROAD_USER'
    END
  )::"UserRole_new";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ROAD_USER';

DROP TYPE "UserRole";

ALTER TYPE "UserRole_new" RENAME TO "UserRole";
