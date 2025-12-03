-- 修复话题回复数负值问题
-- 此脚本会重新计算所有话题的正确回复数

-- 1. 显示当前有负值的话题
SELECT
  id,
  title,
  post_count as current_post_count,
  (SELECT COUNT(*) FROM posts WHERE topic_id = topics.id AND is_deleted = false) as actual_post_count
FROM topics
WHERE post_count < 0
ORDER BY post_count ASC;

-- 2. 修复所有话题的回复数（重新计算）
UPDATE topics
SET
  post_count = (
    SELECT COUNT(*)
    FROM posts
    WHERE posts.topic_id = topics.id
    AND posts.is_deleted = false
  ),
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM topics WHERE post_count < 0
);

-- 3. 验证修复结果
SELECT
  id,
  title,
  post_count,
  (SELECT COUNT(*) FROM posts WHERE topic_id = topics.id AND is_deleted = false) as actual_post_count
FROM topics
WHERE post_count != (
  SELECT COUNT(*)
  FROM posts
  WHERE posts.topic_id = topics.id
  AND posts.is_deleted = false
)
ORDER BY id;
