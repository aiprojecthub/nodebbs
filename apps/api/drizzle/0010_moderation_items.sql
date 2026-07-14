-- 通用内容审核队列表（P1）。手写迁移：drizzle-kit generate 因既有 snapshot 冲突暂不可用。
-- 幂等安全（IF NOT EXISTS），可重复执行。新表、无对既有表的改动。
CREATE TABLE IF NOT EXISTS "moderation_items" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "target_type" varchar(40) NOT NULL,
  "target_id" integer NOT NULL,
  "field" varchar(40),
  "submitted_by" integer,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "payload" jsonb,
  "snapshot" jsonb,
  "reason" text,
  "reviewed_by" integer,
  "reviewed_at" timestamp with time zone,
  CONSTRAINT "moderation_items_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "moderation_items_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);
CREATE INDEX IF NOT EXISTS "moderation_items_status_idx" ON "moderation_items" USING btree ("status");
CREATE INDEX IF NOT EXISTS "moderation_items_target_idx" ON "moderation_items" USING btree ("target_type","target_id");
CREATE INDEX IF NOT EXISTS "moderation_items_submitted_by_idx" ON "moderation_items" USING btree ("submitted_by");
CREATE INDEX IF NOT EXISTS "moderation_items_created_at_idx" ON "moderation_items" USING btree ("created_at");
