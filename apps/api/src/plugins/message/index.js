/**
 * 消息服务插件
 * 统一的消息发送入口，支持 Email 和 SMS 渠道
 * 
 * 使用方式：
 *   await fastify.message.send(type, payload)
 *   - type: VerificationCodeType（验证码类型）
 *   - payload: { to, data, provider? }
 */

import fp from 'fastify-plugin';
import { EmailChannel } from './channels/email.js';
import { SmsChannel } from './channels/sms.js';
import {
  VerificationChannel,
  getVerificationCodeConfig,
} from './config/verificationCode.js';
import { MessageError, MessageErrorCode } from './errors.js';

async function messagePlugin(fastify, opts) {
  fastify.log.info('[消息] 正在初始化服务插件');

  // 初始化渠道实例
  const emailChannel = new EmailChannel(fastify);
  const smsChannel = new SmsChannel(fastify);

  // 渠道映射
  const channels = {
    [VerificationChannel.EMAIL]: emailChannel,
    [VerificationChannel.SMS]: smsChannel,
  };

  /**
   * 消息服务对象
   */
  const messageService = {
    /**
     * 发送消息
     * @param {string} type - 验证码类型（VerificationCodeType）
     * @param {object} payload - 发送载荷
     * @param {string} payload.to - 收件人（邮箱或手机号）
     * @param {object} payload.data - 模板数据
     * @param {string} [payload.provider] - 指定提供商（可选）
     * @returns {Promise<{queued: boolean}>}
     */
    async send(type, payload) {
      const { to, data, provider } = payload;

      // 获取验证码配置
      const config = getVerificationCodeConfig(type);
      if (!config) {
        throw new MessageError(
          MessageErrorCode.INVALID_TYPE,
          `无效的消息类型: ${type}`,
          { type }
        );
      }

      // 获取对应渠道
      const channel = channels[config.channel];
      if (!channel) {
        throw new MessageError(
          MessageErrorCode.UNSUPPORTED_CHANNEL,
          `不支持的消息渠道: ${config.channel}`,
          { channel: config.channel }
        );
      }

      // 构建发送选项
      const sendOptions = {
        to,
        template: config.template,
        data: {
          ...data,
          type: config.description,
          expiryMinutes: config.expiryMinutes,
          identifier: to,
        },
        provider,
      };

      // 调用渠道发送
      return channel.send(sendOptions);
    },

    /**
     * 直接通过 Email 渠道发送（用于非验证码场景）
     */
    email: emailChannel,

    /**
     * 直接通过 SMS 渠道发送
     */
    sms: smsChannel,

    /**
     * 渠道映射（内部使用）
     */
    channels,
  };

  // 注册 fastify.message 装饰器
  fastify.decorate('message', messageService);

  fastify.log.info('[消息] 服务插件初始化完成');
}

export default fp(messagePlugin, {
  name: 'message-plugin',
});

// 导出配置和工具函数
export * from './config/verificationCode.js';
export { messageProviders } from './schema.js';
export { MessageError, MessageErrorCode } from './errors.js';
