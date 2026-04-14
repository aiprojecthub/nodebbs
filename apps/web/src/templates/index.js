import * as defaultTemplate from './default';
import * as minimalTemplate from './minimal';
import * as twitterTemplate from './twitter';

const templates = {
  default: defaultTemplate,
  minimal: minimalTemplate,
  twitter: twitterTemplate,
};

// 第一阶段：通过环境变量硬编码模板名称
// 后续改为从数据库/settings 读取
const ACTIVE_TEMPLATE = process.env.NEXT_PUBLIC_TEMPLATE || 'twitter';

/**
 * 获取当前激活的模板名称
 */
export function getTemplateName() {
  return ACTIVE_TEMPLATE;
}

/**
 * 获取模板组件
 * 优先从当前激活模板中查找，不存在则回退到 default 模板
 * @param {string} componentName - 组件名称
 * @returns {React.ComponentType} 组件
 */
export function getTemplate(componentName) {
  const active = templates[ACTIVE_TEMPLATE];
  return active?.[componentName] || defaultTemplate[componentName];
}
