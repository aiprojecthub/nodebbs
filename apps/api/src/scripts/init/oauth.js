/**
 * OAuth 提供商默认配置和初始化逻辑
 */

import { oauthProviders } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

// OAuth 提供商默认配置
export const OAUTH_PROVIDERS = [
  {
    provider: 'github',
    isEnabled: false,
    displayName: 'GitHub',
    displayOrder: 1,
    scope: JSON.stringify(['user:email', 'read:user']),
    clientId: null,
    clientSecret: null,
    callbackUrl: null,
    additionalConfig: null,
  },
  {
    provider: 'google',
    isEnabled: false,
    displayName: 'Google',
    displayOrder: 2,
    scope: JSON.stringify(['profile', 'email']),
    clientId: null,
    clientSecret: null,
    callbackUrl: null,
    additionalConfig: null,
  },
  {
    provider: 'apple',
    isEnabled: false,
    displayName: 'Apple',
    displayOrder: 3,
    scope: JSON.stringify(['name', 'email']),
    clientId: null,
    clientSecret: null,
    callbackUrl: null,
    additionalConfig: JSON.stringify({ teamId: null, keyId: null }),
  },
];

/**
 * 初始化 OAuth 提供商配置
 */
export async function initOAuthProviders(db, reset = false) {
  console.log('\n🔐 初始化 OAuth 提供商配置...\n');

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const provider of OAUTH_PROVIDERS) {
    if (reset) {
      // 重置模式：删除后重新插入
      await db.delete(oauthProviders).where(eq(oauthProviders.provider, provider.provider));
      await db.insert(oauthProviders).values(provider);
      console.log(`🔄 重置 OAuth 提供商: ${provider.displayName} (${provider.provider})`);
      updatedCount++;
    } else {
      // 默认模式：只添加缺失的配置
      // 先检查是否已存在
      const [existing] = await db
        .select()
        .from(oauthProviders)
        .where(eq(oauthProviders.provider, provider.provider))
        .limit(1);

      if (existing) {
        console.log(`⊙ 跳过 OAuth 提供商: ${provider.displayName} (已存在)`);
        skippedCount++;
      } else {
        // 不存在则插入
        await db.insert(oauthProviders).values(provider);
        console.log(`✓ 添加 OAuth 提供商: ${provider.displayName} (${provider.provider})`);
        addedCount++;
      }
    }
  }

  return { addedCount, updatedCount, skippedCount, total: OAUTH_PROVIDERS.length };
}

/**
 * 列出 OAuth 提供商配置
 */
export function listOAuthProviders() {
  console.log('\n🔐 OAuth 提供商配置\n');
  console.log('='.repeat(80));
  OAUTH_PROVIDERS.forEach((provider) => {
    console.log(`  ${provider.displayName} (${provider.provider})`);
    console.log(`    默认状态: ${provider.isEnabled ? '启用' : '禁用'}`);
    console.log(`    权限范围: ${provider.scope}`);
    console.log(`    显示顺序: ${provider.displayOrder}`);
    console.log();
  });
  console.log('='.repeat(80));
  console.log(`\n总计: ${OAUTH_PROVIDERS.length} 个 OAuth 提供商\n`);
}
