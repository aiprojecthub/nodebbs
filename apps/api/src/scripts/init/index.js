#!/usr/bin/env node
/**
 * 系统配置初始化脚本 (Seeder Manager)
 * 
 * 统一管理系统配置、初始数据和基础数据的初始化、重置与清理。
 */

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { BaseSeeder } from './base.js';

// Import New Seeders
import { SettingsSeeder } from './settings.js';
import { OAuthSeeder } from './oauth.js';
import { MessageSeeder } from './message.js';
import { StorageSeeder } from './storage.js';
import { InvitationSeeder } from './invitation.js';
import { RewardsSeeder } from './rewards.js';
import { LedgerSeeder } from './ledger.js';

import { BadgesSeeder } from './badges.js';
import { ShopSeeder } from './shop.js';
import { CaptchaSeeder } from './captcha.js';
import { AdsSeeder } from './ads.js';
import { RBACSeeder } from './rbac.js';
import { CategorySeeder } from './categories.js';

const { Pool } = pg;



/**
 * SeederManager
 * 管理所有 Seeder 的注册与执行
 */
class SeederManager {
  constructor() {
    this.seeders = new Map();
    this.pool = null;
    this.db = null;
  }

  register(seeder) {
    if (!(seeder instanceof BaseSeeder)) {
      throw new Error(`Seeder '${seeder.constructor.name}' must extend BaseSeeder`);
    }
    this.seeders.set(seeder.key, seeder);
  }

  async connect() {
    if (!this.pool) {
      this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
      this.db = drizzle(this.pool);
    }
    return this.db;
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
    }
  }

  getOrderedSeeders(filterKey = null) {
    // 简单的拓扑排序或依赖顺序
    // 这里简单实现：如果指定了 filterKey，只返回该 Seeder
    // 否则按注册顺序返回（假设注册顺序已经满足依赖）
    // TODO: 实现真正的拓扑排序
    
    if (filterKey) {
      const seeder = this.seeders.get(filterKey);
      if (!seeder) {
        throw new Error(`Seeder '${filterKey}' not found. Available: ${Array.from(this.seeders.keys()).join(', ')}`);
      }
      return [seeder];
    }
    return Array.from(this.seeders.values());
  }

  async init(filterKey = null, reset = false) {
    const db = await this.connect();
    const seeders = this.getOrderedSeeders(filterKey);
    
    console.log(`\n🚀 开始执行初始化 (共 ${seeders.length} 个模块)...\n`);
    
    for (const seeder of seeders) {
      try {
        await seeder.init(db, reset);
      } catch (error) {
        console.error(`❌ [${seeder.key}] 初始化失败:`, error);
        throw error;
      }
    }
    
    console.log('\n✅ 所有任务完成！\n');
  }

  async list(filterKey = null) {
    const seeders = this.getOrderedSeeders(filterKey);
    for (const seeder of seeders) {
      await seeder.list();
    }
  }

  async clean(filterKey = null) {
    console.log('\n⚠️  警告: Clean 操作是破坏性的！');
    if (!filterKey) {
        console.log('即将清空所有支持清理的模块数据...');
    } else {
        console.log(`即将清空模块 '${filterKey}' 的数据...`);
    }
    console.log('按 Ctrl+C 取消，或等待 3 秒后继续...\n');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const db = await this.connect();
    // Clean 顺序通常与 Init 相反，或者需要根据外键依赖
    // 这里简单反转顺序
    const seeders = this.getOrderedSeeders(filterKey).reverse();

    for (const seeder of seeders) {
      await seeder.clean(db);
    }
    
    console.log('\n✅ 清理完成！\n');
  }
}

// --- Main Execution ---

const manager = new SeederManager();

// 1. Register New Seeders
manager.register(new SettingsSeeder());
manager.register(new OAuthSeeder());
manager.register(new MessageSeeder());
manager.register(new StorageSeeder());
manager.register(new InvitationSeeder());
manager.register(new RewardsSeeder());
manager.register(new LedgerSeeder());

manager.register(new BadgesSeeder());
manager.register(new ShopSeeder());
manager.register(new CaptchaSeeder());
manager.register(new AdsSeeder());
manager.register(new RBACSeeder());
manager.register(new CategorySeeder());

// Parse Arguments
const args = process.argv.slice(2);
const help = args.includes('--help') || args.includes('-h');

function showHelp() {
  console.log(`
初始化脚本管理器

用法:
  node api/src/scripts/init/index.js <command> [module] [options]

命令:
  init [module]   初始化/更新数据
  list [module]   查看当前配置
  clean [module]  清理/删除数据
  reset [module]  重置数据 (强制覆盖)

选项:
  --help, -h      显示帮助

模块:
  ${Array.from(manager.seeders.keys()).join(', ')}

示例:
  pnpm seed                 # 初始化所有
  pnpm seed init settings   # 只初始化 settings
  pnpm seed list oauth      # 查看 oauth 配置
  pnpm seed reset ads       # 重置广告位
`);
}

async function run() {
  if (help) {
    showHelp();
    return;
  }

  // Improved Argument Parsing
  // pattern: action [module]
  // actions: init (default implies init if no action matches), list, clean, reset (implies init --reset)
  
  let action = 'init';
  let moduleKey = null;
  let reset = false;

  // Handle flags
  if (args.includes('--reset')) {
    reset = true;
  }

  // Detect simple legacy mapping
  // node index.js --list -> action=list
  if (args.includes('--list')) action = 'list';
  if (args.includes('--clean')) action = 'clean';
  
  // Detect structured commands: init, list, clean, reset
  const commandArg = args.find(a => ['init', 'list', 'clean', 'reset'].includes(a));
  if (commandArg) {
    action = commandArg;
    if (action === 'reset') {
        action = 'init';
        reset = true;
    }
  }

  // Find module key
  const availableKeys = Array.from(manager.seeders.keys());
  
  // Identify potential module argument (any argument that is NOT a command or flag)
  const potentialModuleArg = args.find(a => 
      !['init', 'list', 'clean', 'reset'].includes(a) && 
      !a.startsWith('-')
  );

  if (potentialModuleArg) {
      if (availableKeys.includes(potentialModuleArg)) {
          moduleKey = potentialModuleArg;
      } else {
          console.error(`❌ 错误: 未知的模块名称 '${potentialModuleArg}'`);
          console.log(`ℹ 可用模块: ${availableKeys.join(', ')}`);
          process.exit(1);
      }
  }

  try {
    switch (action) {
      case 'list':
        await manager.list(moduleKey);
        break;
      case 'clean':
        await manager.clean(moduleKey);
        break;
      case 'init':
      default:
        await manager.init(moduleKey, reset);
        break;
    }
  } catch (error) {
    console.error('执行出错:', error);
    process.exit(1);
  } finally {
    await manager.disconnect();
  }
}

run();
