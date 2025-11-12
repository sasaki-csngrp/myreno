-- AlterTable: Change email_verified from BOOLEAN to TIMESTAMP
-- NextAuth.js expects emailVerified to be DateTime? type

-- Step 1: Add a new temporary column with TIMESTAMP type
ALTER TABLE "public"."reno_users" 
ADD COLUMN "email_verified_new" TIMESTAMP(6);

-- Step 2: Migrate data: Convert TRUE to current timestamp, FALSE/NULL to NULL
UPDATE "public"."reno_users"
SET "email_verified_new" = CASE 
  WHEN "email_verified" = TRUE THEN NOW()
  ELSE NULL
END;

-- Step 3: Drop the old column
ALTER TABLE "public"."reno_users" 
DROP COLUMN "email_verified";

-- Step 4: Rename the new column to the original name
ALTER TABLE "public"."reno_users" 
RENAME COLUMN "email_verified_new" TO "email_verified";

