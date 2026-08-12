-- accounts 增加 unique(user_id, provider)。手写迁移：drizzle-kit generate 因既有 snapshot 冲突暂不可用。
--
-- 为什么需要：linkOAuthAccountForUser 里「同一平台只允许绑定一个账号」是先读后写，
-- 同一用户并发关联同一平台的两个不同三方账号时，两个请求都能通过检查并各插一行。
-- 表上原有的 unique(provider, provider_account_id) 拦不住这种情况（两行的
-- provider_account_id 本来就不同）。
--
-- 幂等安全（IF NOT EXISTS），可重复执行。
--
-- ⚠️ 若库里已存在重复数据，本语句会直接报错并回滚（这是刻意的：不静默删数据）。
-- 先执行下面的查询确认：
--
--   SELECT user_id, provider, count(*), array_agg(id ORDER BY created_at)
--   FROM accounts GROUP BY user_id, provider HAVING count(*) > 1;
--
-- 确认无误后，如需保留每组最新一行再建索引，手动执行：
--
--   DELETE FROM accounts a USING accounts b
--   WHERE a.user_id = b.user_id AND a.provider = b.provider
--     AND (a.created_at, a.id) < (b.created_at, b.id);
--
-- 注意这会删掉用户的历史关联记录，删前请自行备份。

CREATE UNIQUE INDEX IF NOT EXISTS "accounts_user_provider_unique"
  ON "accounts" USING btree ("user_id","provider");
