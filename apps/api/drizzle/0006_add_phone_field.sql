-- Add phone and isPhoneVerified fields to users table
ALTER TABLE "users" ADD COLUMN "phone" varchar(20);
ALTER TABLE "users" ADD COLUMN "is_phone_verified" boolean NOT NULL DEFAULT false;

-- Make email nullable (for phone-only registration)
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Add phone index
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users" USING btree ("phone");
