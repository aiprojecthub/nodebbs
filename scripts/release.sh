#!/bin/bash
set -e  # 任意命令失败则立即退出

# 1. 从分支名提取版本号（如 dev/1.4.5 → 1.4.5）
BRANCH=$(git branch --show-current)
VERSION=${BRANCH#dev/}

# 2. 验证版本号格式
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ 无效的版本号格式: $VERSION"
  echo "   请确保分支名格式为 dev/x.y.z"
  exit 1
fi

echo "🚀 准备发布 v$VERSION"
read -p "确认发布? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "已取消"
  exit 0
fi

# 3. 更新所有 package.json 的版本号（使用 sed 保持格式）
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" \
  package.json apps/api/package.json apps/web/package.json

# 4. 提交版本变更
git add .
git commit -m "chore: release v$VERSION"

# 5. 合并到 main 分支
git checkout main
git pull origin main
git merge "$BRANCH" -m "Merge branch '$BRANCH' for release v$VERSION"

# 6. 创建 tag 并推送
git tag "v$VERSION"
git push origin main
git push origin "v$VERSION"

# 7. 回到开发分支
git checkout "$BRANCH"

echo "✅ v$VERSION 发布完成！"