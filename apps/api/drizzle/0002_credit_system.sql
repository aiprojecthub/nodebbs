-- 积分系统相关表迁移脚本
-- 创建时间: 2024

-- 用户积分账户表
CREATE TABLE IF NOT EXISTS "user_credits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_credits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"user_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"last_check_in_date" timestamp with time zone,
	"check_in_streak" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_credits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint

-- 积分交易记录表
CREATE TABLE IF NOT EXISTS "credit_transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credit_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"balance" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"related_user_id" integer,
	"related_topic_id" integer,
	"related_post_id" integer,
	"related_item_id" integer,
	"description" text,
	"metadata" text
);
--> statement-breakpoint

-- 帖子打赏记录表
CREATE TABLE IF NOT EXISTS "post_rewards" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "post_rewards_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"post_id" integer NOT NULL,
	"from_user_id" integer NOT NULL,
	"to_user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"message" text
);
--> statement-breakpoint

-- 商城商品表
CREATE TABLE IF NOT EXISTS "shop_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shop_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"type" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"image_url" varchar(500),
	"stock" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" text,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint

-- 用户商品拥有表
CREATE TABLE IF NOT EXISTS "user_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"is_equipped" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint

-- 积分系统配置表
CREATE TABLE IF NOT EXISTS "credit_system_config" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credit_system_config_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"value_type" varchar(20) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	CONSTRAINT "credit_system_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint

-- 添加外键约束
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_related_user_id_users_id_fk" FOREIGN KEY ("related_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_related_topic_id_topics_id_fk" FOREIGN KEY ("related_topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_related_post_id_posts_id_fk" FOREIGN KEY ("related_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "post_rewards" ADD CONSTRAINT "post_rewards_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_rewards" ADD CONSTRAINT "post_rewards_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "post_rewards" ADD CONSTRAINT "post_rewards_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "user_items" ADD CONSTRAINT "user_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_items" ADD CONSTRAINT "user_items_item_id_shop_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."shop_items"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- 创建索引
CREATE INDEX "user_credits_user_idx" ON "user_credits" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "user_credits_balance_idx" ON "user_credits" USING btree ("balance");
--> statement-breakpoint

CREATE INDEX "credit_transactions_user_idx" ON "credit_transactions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions" USING btree ("created_at");
--> statement-breakpoint

CREATE INDEX "post_rewards_post_idx" ON "post_rewards" USING btree ("post_id");
--> statement-breakpoint
CREATE INDEX "post_rewards_from_user_idx" ON "post_rewards" USING btree ("from_user_id");
--> statement-breakpoint
CREATE INDEX "post_rewards_to_user_idx" ON "post_rewards" USING btree ("to_user_id");
--> statement-breakpoint
CREATE INDEX "post_rewards_created_at_idx" ON "post_rewards" USING btree ("created_at");
--> statement-breakpoint

CREATE INDEX "shop_items_type_idx" ON "shop_items" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "shop_items_is_active_idx" ON "shop_items" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX "shop_items_display_order_idx" ON "shop_items" USING btree ("display_order");
--> statement-breakpoint

CREATE INDEX "user_items_user_idx" ON "user_items" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "user_items_item_idx" ON "user_items" USING btree ("item_id");
--> statement-breakpoint
CREATE INDEX "user_items_equipped_idx" ON "user_items" USING btree ("is_equipped");
--> statement-breakpoint

CREATE INDEX "credit_system_config_key_idx" ON "credit_system_config" USING btree ("key");
--> statement-breakpoint
CREATE INDEX "credit_system_config_category_idx" ON "credit_system_config" USING btree ("category");
--> statement-breakpoint

-- 插入初始配置数据
INSERT INTO "credit_system_config" ("key", "value", "value_type", "description", "category") VALUES
('system_enabled', 'true', 'boolean', '是否启用积分系统', 'general'),
('check_in_base_amount', '10', 'number', '签到基础积分', 'earning'),
('check_in_streak_bonus', '5', 'number', '连续签到额外奖励（每天）', 'earning'),
('post_topic_amount', '5', 'number', '发布话题奖励', 'earning'),
('post_reply_amount', '2', 'number', '发布回复奖励', 'earning'),
('receive_like_amount', '1', 'number', '获得点赞奖励', 'earning'),
('reward_min_amount', '1', 'number', '打赏最小金额', 'spending'),
('reward_max_amount', '1000', 'number', '打赏最大金额', 'spending'),
('invite_reward_amount', '50', 'number', '邀请新用户奖励', 'earning')
ON CONFLICT ("key") DO NOTHING;
