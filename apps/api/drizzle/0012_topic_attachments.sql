-- 话题附件（附件组 + 组内文件 + 积分购买记录）。手写迁移：drizzle-kit generate 因既有 snapshot 冲突暂不可用。
-- 幂等安全（IF NOT EXISTS），可重复执行。均为新表、无对既有表的改动。
--
-- 模型：一条 topic_attachments = 一个「附件组」（正文一条 ::attachment{id} 指令），
--       组内文件挂在 topic_attachment_files 上。下载策略/积分购买在组级，下载计数在文件级。
CREATE TABLE IF NOT EXISTS "topic_attachments" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "topic_id" integer,
  "user_id" integer NOT NULL,
  "title" varchar(255),
  "description" text,
  "policy" varchar(20) DEFAULT 'none' NOT NULL,
  "points_cost" integer DEFAULT 0 NOT NULL,
  "allowed_role_ids" jsonb,
  CONSTRAINT "topic_attachments_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "topic_attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
CREATE INDEX IF NOT EXISTS "topic_attachments_topic_idx" ON "topic_attachments" USING btree ("topic_id");
CREATE INDEX IF NOT EXISTS "topic_attachments_user_idx" ON "topic_attachments" USING btree ("user_id");

CREATE TABLE IF NOT EXISTS "topic_attachment_files" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "attachment_id" integer NOT NULL,
  "file_id" integer NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "download_count" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "topic_attachment_files_attachment_id_topic_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."topic_attachments"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "topic_attachment_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action
);
CREATE INDEX IF NOT EXISTS "topic_attachment_files_attachment_idx" ON "topic_attachment_files" USING btree ("attachment_id");
-- 一个文件只能归属一个附件组，避免同一份文件被挂出两套下载策略
CREATE UNIQUE INDEX IF NOT EXISTS "topic_attachment_files_file_idx" ON "topic_attachment_files" USING btree ("file_id");

CREATE TABLE IF NOT EXISTS "attachment_purchases" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "attachment_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "amount_paid" integer NOT NULL,
  CONSTRAINT "attachment_purchases_attachment_id_topic_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."topic_attachments"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "attachment_purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
-- UNIQUE 兜底防并发重复扣费
CREATE UNIQUE INDEX IF NOT EXISTS "attachment_purchases_att_user_idx" ON "attachment_purchases" USING btree ("attachment_id","user_id");
CREATE INDEX IF NOT EXISTS "attachment_purchases_user_idx" ON "attachment_purchases" USING btree ("user_id");
