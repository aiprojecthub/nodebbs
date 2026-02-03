CREATE TABLE IF NOT EXISTS "files" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255),
	"url" varchar(500) NOT NULL,
	"category" varchar(50) NOT NULL,
	"mimetype" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "files_user_id_idx" ON "files" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "files_category_idx" ON "files" USING btree ("category");
--> statement-breakpoint
CREATE INDEX "files_created_at_idx" ON "files" USING btree ("created_at");
