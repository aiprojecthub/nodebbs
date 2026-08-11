/**
 * 操作日志常量 — 中文映射 & 样式
 */

/** 目标类型中文映射 */
export const TARGET_TYPE_LABELS = {
  topic: '话题',
  post: '回复',
  user: '用户',
  report: '举报',
};

/**
 * 用户自操作：描述已自含宾语，不拼接目标类型
 * 同时用于判断是否隐藏 targetInfo
 */
export const SELF_ACTION_LABELS = {
  username_change: '修改了用户名',
  email_bind: '绑定了邮箱',
  phone_bind: '绑定了手机号',
  email_change: '修改了邮箱',
  phone_change: '修改了手机号',
  request_deletion: '申请了账号注销',
  oauth_link: '关联了三方账号',
  oauth_unlink: '解除了三方账号关联',
};

/** 管理/审核操作动词，渲染时拼接「了 + 目标类型」 */
export const ACTION_VERB_LABELS = {
  approve: '批准',
  reject: '拒绝',
  restore: '恢复',
  resubmit: '重新提交',
  edit_resubmit: '编辑后重新提交',
  ban: '封禁',
  unban: '解封',
  anonymize: '匿名化',
  report_resolve: '处理',
  report_dismiss: '驳回',
};

/** action → 颜色 class */
export const ACTION_COLORS = {
  approve: 'text-green-600',
  reject: 'text-red-600',
  restore: 'text-blue-600',
  resubmit: 'text-blue-600',
  edit_resubmit: 'text-blue-600',
  ban: 'text-red-600',
  unban: 'text-green-600',
  username_change: 'text-yellow-600',
  email_bind: 'text-blue-600',
  phone_bind: 'text-blue-600',
  email_change: 'text-yellow-600',
  phone_change: 'text-yellow-600',
  request_deletion: 'text-red-600',
  anonymize: 'text-red-600',
  report_resolve: 'text-green-600',
  report_dismiss: 'text-yellow-600',
  oauth_link: 'text-blue-600',
  oauth_unlink: 'text-yellow-600',
};

/** 筛选下拉选项 */
export const ACTION_FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'approve', label: '批准' },
  { value: 'reject', label: '拒绝' },
  { value: 'ban', label: '封禁' },
  { value: 'unban', label: '解封' },
  { value: 'username_change', label: '修改用户名' },
  { value: 'email_bind', label: '绑定邮箱' },
  { value: 'phone_bind', label: '绑定手机号' },
  { value: 'email_change', label: '修改邮箱' },
  { value: 'phone_change', label: '修改手机号' },
  { value: 'request_deletion', label: '申请注销' },
  { value: 'restore', label: '恢复' },
  { value: 'anonymize', label: '匿名化' },
  { value: 'resubmit', label: '重新提交' },
  { value: 'edit_resubmit', label: '编辑后重新提交' },
  { value: 'report_resolve', label: '处理举报' },
  { value: 'report_dismiss', label: '驳回举报' },
  { value: 'oauth_link', label: '关联三方账号' },
  { value: 'oauth_unlink', label: '解绑三方账号' },
];

/**
 * 根据 action + targetType 生成操作描述
 */
export function getActionDescription(action, targetType) {
  const selfText = SELF_ACTION_LABELS[action];
  if (selfText) return selfText;

  const targetLabel = TARGET_TYPE_LABELS[targetType] || targetType;
  const verb = ACTION_VERB_LABELS[action] || action;
  return `${verb}了${targetLabel}`;
}

/**
 * 判断是否为用户自操作（用于隐藏冗余 targetInfo）
 */
export function isSelfAction(action) {
  return action in SELF_ACTION_LABELS;
}
