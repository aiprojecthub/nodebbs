-- Data merge: combine isEnabled AND isDefault into isEnabled before dropping isDefault
UPDATE "captcha_providers" SET "is_enabled" = ("is_enabled" AND "is_default");
--> statement-breakpoint
UPDATE "message_providers" SET "is_enabled" = ("is_enabled" AND "is_default");
--> statement-breakpoint
UPDATE "email_providers" SET "is_enabled" = ("is_enabled" AND "is_default");
--> statement-breakpoint
-- Drop isDefault columns
ALTER TABLE "captcha_providers" DROP COLUMN IF EXISTS "is_default";
--> statement-breakpoint
ALTER TABLE "message_providers" DROP COLUMN IF EXISTS "is_default";
--> statement-breakpoint
ALTER TABLE "email_providers" DROP COLUMN IF EXISTS "is_default";
--> statement-breakpoint
-- Drop isDefault indexes
DROP INDEX IF EXISTS "captcha_providers_is_default_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "message_providers_is_default_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "email_providers_is_default_idx";
