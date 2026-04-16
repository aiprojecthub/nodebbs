import * as defaultTemplate from './default';
import * as minimalTemplate from './minimal';
import * as twitterTemplate from './twitter';
import * as jatraTemplate from './jatra';
import * as mediumTemplate from './medium';

const templates = {
  default: defaultTemplate,
  minimal: minimalTemplate,
  twitter: twitterTemplate,
  jatra: jatraTemplate,
  medium: mediumTemplate,
};

// 第一阶段：通过环境变量硬编码模板名称
// 后续改为从数据库/settings 读取
const ACTIVE_TEMPLATE = process.env.NEXT_PUBLIC_TEMPLATE || 'medium';

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
  const component = active?.[componentName] || defaultTemplate[componentName];
  if (process.env.NODE_ENV === 'development' && !component) {
    console.warn(`[templates] Component not found: "${componentName}"`);
  }
  return component;
}

/**
 * 获取当前模板的 manifest 元数据
 */
export function getTemplateMeta() {
  const active = templates[ACTIVE_TEMPLATE];
  return active?.manifest || defaultTemplate.manifest;
}

/**
 * 获取所有已注册模板列表
 */
export function getTemplateList() {
  return Object.keys(templates).map(key => ({
    id: key,
    ...(templates[key].manifest || {}),
  }));
}
