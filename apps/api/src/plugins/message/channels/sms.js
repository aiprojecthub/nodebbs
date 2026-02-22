/**
 * SMS 渠道实现
 * 负责短信发送的统一入口
 */

import { BaseChannel } from './base.js';
import { eq, and } from 'drizzle-orm';
import db from '../../../db/index.js';
import { messageProviders } from '../schema.js';
import { smsProviderSenders } from '../providers/sms/index.js';
import { getSmsTemplate } from '../templates/sms/index.js';
import { isDev } from '../../../config/env.js';
import { MessageError, MessageErrorCode } from '../errors.js';

export class SmsChannel extends BaseChannel {
  constructor(fastify) {
    super(fastify);
    this.channelType = 'sms';
  }

  /**
   * 获取默认 SMS 提供商配置
   */
  async getDefaultProvider() {
    const result = await db
      .select()
      .from(messageProviders)
      .where(and(
        eq(messageProviders.channel, this.channelType),
        eq(messageProviders.isEnabled, true)
      ))
      .limit(1);

    return this.parseConfig(result[0]);
  }

  /**
   * 获取指定 SMS 提供商配置
   */
  async getProvider(name) {
    const result = await db
      .select()
      .from(messageProviders)
      .where(and(
        eq(messageProviders.channel, this.channelType),
        eq(messageProviders.provider, name)
      ))
      .limit(1);

    return this.parseConfig(result[0]);
  }

  /**
   * 发送短信
   * @param {object} options - 发送选项
   * @param {string} options.to - 收件人手机号
   * @param {string} options.template - 模板名称（对应 VerificationCodeConfig 中的 template）
   * @param {object} options.data - 模板数据（如 { code: '123456' }）
   * @param {string} [options.provider] - 指定提供商
   * @returns {Promise<{queued: boolean}>}
   */
  async send(options) {
    const { to, template, data, provider: providerName } = options;

    // ===== 验证必需参数 =====
    if (!to) {
      throw new MessageError(
        MessageErrorCode.MISSING_RECIPIENT,
        '收件人手机号 (to) 是必需的'
      );
    }
    if (!template) {
      throw new MessageError(
        MessageErrorCode.MISSING_TEMPLATE,
        '短信模板 (template) 是必需的'
      );
    }

    // ===== 获取提供商配置 =====
    let provider;
    if (providerName) {
      provider = await this.getProvider(providerName);
    } else {
      provider = await this.getDefaultProvider();
    }

    if (!provider) {
      throw new MessageError(
        MessageErrorCode.PROVIDER_NOT_CONFIGURED,
        '短信服务未配置'
      );
    }
    // 只在未显式指定 provider 时检查 isEnabled
    if (!providerName && !provider.isEnabled) {
      throw new MessageError(
        MessageErrorCode.PROVIDER_DISABLED,
        '短信服务未启用',
        { provider: provider.provider }
      );
    }

    // ===== 获取模板配置 =====
    const templateConfig = getSmsTemplate(template, provider.provider);
    if (!templateConfig) {
      throw new MessageError(
        MessageErrorCode.TEMPLATE_NOT_FOUND,
        `短信模板不存在: ${template}`,
        { template }
      );
    }

    // 从 provider 配置中获取真实的 templateCode/templateId
    const templatesConfig = provider.config.templates || {};
    const realTemplateId = templatesConfig[template] || 
                          (provider.provider === 'tencent' ? templateConfig.templateId : templateConfig.templateCode);

    if (realTemplateId === template) {
       this.fastify.log.warn(`[短信] 模板 ${template} 未在提供商配置中映射真实 ID，尝试直接使用默认值`);
    }

    const missingParams = templateConfig.params.filter(param => data[param] === undefined || data[param] === null || data[param] === '');
    if (missingParams.length > 0) {
      throw new MessageError(
        MessageErrorCode.MISSING_PARAMS,
        `短信模板 ${template} 缺少必要参数: ${missingParams.join(', ')}`,
        { template, missingParams }
      );
    }

    if (isDev) {
      this.fastify.log.info(`[短信发送] 手机号: ${to}, 数据: ${JSON.stringify(data)}, 模板: ${template} (${realTemplateId})`);
    }

    const senderFn = smsProviderSenders[provider.provider];
    if (!senderFn) {
      throw new MessageError(
        MessageErrorCode.UNSUPPORTED_PROVIDER,
        `不支持的短信提供商: ${provider.provider}`,
        { provider: provider.provider }
      );
    }

    const sendOptions = {
      to,
      templateCode: realTemplateId,
      templateId: realTemplateId,
      templateParams: this.buildTemplateParams(templateConfig, data, provider.provider),
    };

    const sendPromise = senderFn(provider.config, sendOptions)
      .then((result) => {
        this.fastify.log.info(`[短信发送成功] 手机号: ${to}, 模板: ${template}, MessageId: ${result.messageId || 'N/A'}`);
        return result;
      })
      .catch((error) => {
        this.fastify.log.error(`[短信发送失败] 手机号: ${to}, 模板: ${template}, 错误: ${error.message}`);
        throw error;
      });

    if (options.wait) {
      return await sendPromise;
    }

    sendPromise.catch(() => {});

    return { queued: true };
  }

  /**
   * 根据提供商类型构建模板参数
   * 阿里云使用对象格式，腾讯云使用数组格式
   */
  buildTemplateParams(templateConfig, data, providerType) {
    if (providerType === 'tencent') {
      // 腾讯云：参数为有序数组
      return templateConfig.params.map(param => String(data[param] || ''));
    } else {
      // 阿里云：参数为对象
      const params = {};
      templateConfig.params.forEach(param => {
        if (data[param] !== undefined) {
          params[param] = String(data[param]);
        }
      });
      return params;
    }
  }
}

