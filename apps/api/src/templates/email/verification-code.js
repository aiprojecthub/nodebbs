/**
 * 验证码邮件模板（通用）
 * 用于所有需要验证码的场景
 */
export default function verificationCodeTemplate({
  code,
  type,
  expiryMinutes,
  identifier,
}) {
  return {
    subject: `${type}验证码`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${type}验证码</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #333; font-size: 28px; font-weight: 600;">
                ${type}验证码
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
                你好，
              </p>
              <p style="margin: 0 0 20px; color: #666; font-size: 16px; line-height: 1.6;">
                你正在进行 <strong style="color: #333;">${type}</strong> 操作，请使用以下验证码完成验证：
              </p>

              <!-- Verification Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center" style="background-color: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; padding: 20px;">
                    <div style="font-size: 36px; font-weight: 700; color: #007bff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; color: #666; font-size: 14px; line-height: 1.6;">
                <strong>有效期：</strong>${expiryMinutes} 分钟
              </p>

              <p style="margin: 10px 0 0; color: #999; font-size: 14px; line-height: 1.6;">
                为了保障你的账号安全，请勿将验证码透露给他人。
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999; font-size: 12px; line-height: 1.6; text-align: center;">
                如果这不是你的操作，请忽略此邮件。
              </p>
              <p style="margin: 10px 0 0; color: #999; font-size: 12px; line-height: 1.6; text-align: center;">
                此邮件发送至: ${identifier}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
${type}验证码

你好，

你正在进行 ${type} 操作，请使用以下验证码完成验证：

验证码: ${code}

有效期: ${expiryMinutes} 分钟

为了保障你的账号安全，请勿将验证码透露给他人。

如果这不是你的操作，请忽略此邮件。

此邮件发送至: ${identifier}
    `.trim(),
  };
}
