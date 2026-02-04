/**
 * SMTP 邮件提供商
 * 使用 nodemailer 发送邮件
 */
import nodemailer from 'nodemailer';

/**
 * 通过 SMTP 发送邮件
 * @param {object} providerConfig - 提供商配置（已解析的 config 对象）
 * @param {object} options - 发送选项
 * @param {string} options.to - 收件人
 * @param {string} options.subject - 主题
 * @param {string} options.html - HTML 内容
 * @param {string} options.text - 纯文本内容
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
export async function sendViaSMTP(providerConfig, { to, subject, html, text }) {
  const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword, fromEmail, fromName } = providerConfig;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text,
    html,
  });

  return { success: true, messageId: info.messageId };
}
