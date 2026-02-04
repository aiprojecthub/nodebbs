/**
 * StopForumSpam API 集成
 * 用于检测垃圾注册用户
 * API 文档: https://www.stopforumspam.com/usage
 */

const STOPFORUMSPAM_API = 'https://api.stopforumspam.org/api';

/**
 * 检查用户是否在 StopForumSpam 数据库中
 * @param {Object} params - 检查参数
 * @param {string} params.ip - IP 地址
 * @param {string} params.email - 邮箱地址
 * @param {string} params.username - 用户名
 * @param {Array<string>} checkTypes - 要检查的类型数组 ['ip', 'email', 'username']
 * @param {string} apiKey - StopForumSpam API Key（可选）
 * @returns {Promise<Object>} - 检查结果
 */
export async function checkSpammer({ ip, email, username }, checkTypes = ['ip', 'email', 'username'], apiKey = '') {
  try {
    // 构建查询参数
    const queryParams = new URLSearchParams();

    // 如果提供了 API Key，添加到请求参数中
    if (apiKey && apiKey.trim()) {
      queryParams.append('api_key', apiKey.trim());
    }

    queryParams.append('json', '1'); // 返回 JSON 格式

    // 根据配置添加要检查的参数
    if (checkTypes.includes('ip') && ip) {
      queryParams.append('ip', ip);
    }
    if (checkTypes.includes('email') && email) {
      queryParams.append('email', email);
    }
    if (checkTypes.includes('username') && username) {
      queryParams.append('username', username);
    }

    // 如果没有任何参数需要检查，直接返回不是垃圾用户
    if (!queryParams.has('ip') && !queryParams.has('email') && !queryParams.has('username')) {
      return {
        isSpammer: false,
        confidence: 0,
        details: {},
      };
    }

    // 调用接口（设置 5 秒超时）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${STOPFORUMSPAM_API}?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'NodeBBS-Forum/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`StopForumSpam 接口返回 ${response.status}`);
    }

    const data = await response.json();
    // console.log('[StopForumSpam] 接口结果:', data);

    // 检查接口是否成功
    if (!data.success) {
      throw new Error('StopForumSpam 接口返回 success=false');
    }

    // 分析结果
    const results = {
      isSpammer: false,
      confidence: 0,
      details: {},
    };

    // 检查 IP
    if (data.ip && checkTypes.includes('ip')) {
      const ipAppears = data.ip.appears === 1 || data.ip.appears === true;
      const ipFrequency = data.ip.frequency || 0;

      results.details.ip = {
        appears: ipAppears,
        frequency: ipFrequency,
        lastSeen: data.ip.lastseen || null,
      };

      if (ipAppears) {
        results.isSpammer = true;
        // 频率越高，置信度越高（最高 100）
        results.confidence = Math.max(results.confidence, Math.min(100, ipFrequency * 10));
      }
    }

    // 检查邮箱
    if (data.email && checkTypes.includes('email')) {
      const emailAppears = data.email.appears === 1 || data.email.appears === true;
      const emailFrequency = data.email.frequency || 0;

      results.details.email = {
        appears: emailAppears,
        frequency: emailFrequency,
        lastSeen: data.email.lastseen || null,
      };

      if (emailAppears) {
        results.isSpammer = true;
        results.confidence = Math.max(results.confidence, Math.min(100, emailFrequency * 10));
      }
    }

    // 检查用户名
    if (data.username && checkTypes.includes('username')) {
      const usernameAppears = data.username.appears === 1 || data.username.appears === true;
      const usernameFrequency = data.username.frequency || 0;

      results.details.username = {
        appears: usernameAppears,
        frequency: usernameFrequency,
        lastSeen: data.username.lastseen || null,
      };

      if (usernameAppears) {
        results.isSpammer = true;
        results.confidence = Math.max(results.confidence, Math.min(100, usernameFrequency * 10));
      }
    }

    return results;
  } catch (error) {
    // 接口调用失败时，记录错误但不阻止注册
    console.error('[StopForumSpam] 接口调用失败:', error.message);

    return {
      isSpammer: false,
      confidence: 0,
      details: {},
      error: error.message,
    };
  }
}

/**
 * 格式化垃圾用户检查结果为可读消息
 * @param {Object} result - checkSpammer 返回的结果
 * @returns {string} - 可读的错误消息
 */
export function formatSpamCheckMessage(result) {
  if (!result.isSpammer) {
    return '';
  }

  const reasons = [];

  if (result.details.ip?.appears) {
    reasons.push(`IP地址 (出现次数: ${result.details.ip.frequency})`);
  }

  if (result.details.email?.appears) {
    reasons.push(`邮箱地址 (出现次数: ${result.details.email.frequency})`);
  }

  if (result.details.username?.appears) {
    reasons.push(`用户名 (出现次数: ${result.details.username.frequency})`);
  }

  return `检测到垃圾注册行为，已被拦截。原因: ${reasons.join('、')}`;
}
