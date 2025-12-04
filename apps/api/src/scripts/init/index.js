#!/usr/bin/env node
/**
 * 系统配置初始化脚本
 * 用于初始化或还原系统配置到默认值
 *
 * 使用方法:
 *   node api/src/scripts/init/index.js [选项]
 *
 * 选项:
 *   --reset    重置所有配置到默认值（会覆盖现有配置）
 *   --missing  只添加缺失的配置（默认行为）
 *   --list     列出所有配置项
 */

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  initSystemSettings,
  listSystemSettings,
  SETTING_KEYS,
  SETTINGS_BY_CATEGORY,
  CATEGORY_NAMES,
} from './settings.js';
import { initOAuthProviders, listOAuthProviders } from './oauth.js';
import { initInvitationRules, listInvitationRules } from './invitation.js';
import { initEmailProviders, listEmailProviders } from './email.js';
import { initCreditConfigs, listCreditConfigs } from './credits.js';

const { Pool } = pg;

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
  reset: args.includes('--reset'),
  missing: args.includes('--missing') || args.length === 0,
  list: args.includes('--list'),
  help: args.includes('--help') || args.includes('-h'),
};

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
系统配置初始化脚本

使用方法:
  node api/src/scripts/init/index.js [选项]

选项:
  --reset     重置所有配置到默认值（会覆盖现有配置）
  --missing   只添加缺失的配置（默认行为）
  --list      列出所有配置项及其默认值
  --help, -h  显示此帮助信息

功能:
  - 初始化系统设置（站点名称、注册模式、访问限速等）
  - 初始化 OAuth 提供商配置（GitHub、Google、Apple）
  - 初始化邮件服务提供商配置（SMTP、SendGrid、Resend、阿里云）
  - 初始化邀请规则配置（user、vip、moderator、admin）
  - 初始化积分系统配置（系统开关、获取规则、消费规则）

示例:
  # 添加缺失的配置（不覆盖现有配置）
  node api/src/scripts/init/index.js

  # 重置所有配置到默认值
  node api/src/scripts/init/index.js --reset

  # 列出所有配置项
  node api/src/scripts/init/index.js --list
`);
}

/**
 * 列出所有配置
 */
function listAllSettings() {
  listSystemSettings();
  listOAuthProviders();
  listEmailProviders();
  listInvitationRules();
  listCreditConfigs();
}

/**
 * 初始化所有配置
 */
async function initAllSettings(reset = false) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    console.log('\n🚀 开始初始化系统配置...\n');

    // 1. 初始化系统设置
    const settingsResult = await initSystemSettings(db, reset);

    // 2. 初始化 OAuth 提供商配置
    const oauthResult = await initOAuthProviders(db, reset);

    // 3. 初始化邮件服务提供商配置
    const emailResult = await initEmailProviders(db, reset);

    // 4. 初始化邀请规则配置
    const invitationResult = await initInvitationRules(db, reset);

    // 5. 初始化积分系统配置
    const creditsResult = await initCreditConfigs(db, reset);

    // 显示统计信息
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 配置初始化完成！\n');

    // 系统设置统计
    console.log(`系统设置统计:`);
    if (reset) {
      console.log(`  - 重置: ${settingsResult.updatedCount} 个配置`);
    } else {
      console.log(`  - 新增: ${settingsResult.addedCount} 个配置`);
      console.log(`  - 跳过: ${settingsResult.skippedCount} 个配置（已存在）`);
    }
    console.log(`  - 总计: ${settingsResult.total} 个配置\n`);

    // OAuth 提供商统计
    console.log(`OAuth 提供商统计:`);
    if (reset) {
      console.log(`  - 重置: ${oauthResult.updatedCount} 个提供商`);
    } else {
      console.log(`  - 新增: ${oauthResult.addedCount} 个提供商`);
      console.log(`  - 跳过: ${oauthResult.skippedCount} 个提供商（已存在）`);
    }
    console.log(`  - 总计: ${oauthResult.total} 个提供商\n`);

    // 邮件服务提供商统计
    console.log(`邮件服务提供商统计:`);
    if (reset) {
      console.log(`  - 重置: ${emailResult.updatedCount} 个提供商`);
    } else {
      console.log(`  - 新增: ${emailResult.addedCount} 个提供商`);
      console.log(`  - 跳过: ${emailResult.skippedCount} 个提供商（已存在）`);
    }
    console.log(`  - 总计: ${emailResult.total} 个提供商\n`);

    // 邀请规则统计
    console.log(`邀请规则统计:`);
    if (reset) {
      console.log(`  - 重置: ${invitationResult.updatedCount} 个规则`);
    } else {
      console.log(`  - 新增: ${invitationResult.addedCount} 个规则`);
      console.log(`  - 跳过: ${invitationResult.skippedCount} 个规则（已存在）`);
    }
    console.log(`  - 总计: ${invitationResult.total} 个规则\n`);

    // 积分系统配置统计
    console.log(`积分系统配置统计:`);
    if (reset) {
      console.log(`  - 重置: ${creditsResult.updatedCount} 个配置`);
    } else {
      console.log(`  - 新增: ${creditsResult.addedCount} 个配置`);
      console.log(`  - 跳过: ${creditsResult.skippedCount} 个配置（已存在）`);
    }
    console.log(`  - 总计: ${creditsResult.total} 个配置\n`);

    // 显示按分类的统计
    console.log('系统设置按分类统计:');
    Object.entries(SETTINGS_BY_CATEGORY).forEach(([category, settings]) => {
      console.log(`  - ${CATEGORY_NAMES[category] || category}: ${settings.length} 个配置`);
    });
    console.log();
  } catch (error) {
    console.error('\n❌ 初始化失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * 主函数
 */
async function main() {
  if (options.help) {
    showHelp();
    return;
  }

  if (options.list) {
    listAllSettings();
    return;
  }

  if (options.reset) {
    console.log('\n⚠️  警告: 此操作将重置所有配置到默认值！');
    console.log('按 Ctrl+C 取消，或等待 3 秒后继续...\n');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  await initAllSettings(options.reset);
}

// 执行
main().catch((error) => {
  console.error('执行失败:', error);
  process.exit(1);
});
