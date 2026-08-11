/**
 * 操作日志常量
 */

export const OPLOG_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  BAN: 'ban',
  UNBAN: 'unban',
  USERNAME_CHANGE: 'username_change',
  EMAIL_BIND: 'email_bind',
  PHONE_BIND: 'phone_bind',
  EMAIL_CHANGE: 'email_change',
  PHONE_CHANGE: 'phone_change',
  REQUEST_DELETION: 'request_deletion',
  RESTORE: 'restore',
  ANONYMIZE: 'anonymize',
  EDIT_RESUBMIT: 'edit_resubmit',
  RESUBMIT: 'resubmit',
  REPORT_RESOLVE: 'report_resolve',
  REPORT_DISMISS: 'report_dismiss',
  OAUTH_LINK: 'oauth_link',
  OAUTH_UNLINK: 'oauth_unlink',
};

export const OPLOG_TARGET_TYPES = {
  TOPIC: 'topic',
  POST: 'post',
  USER: 'user',
  REPORT: 'report',
};

/** 所有合法 action 值集合，用于服务层验证 */
export const VALID_ACTIONS = new Set(Object.values(OPLOG_ACTIONS));

/** 所有合法 targetType 值集合 */
export const VALID_TARGET_TYPES = new Set(Object.values(OPLOG_TARGET_TYPES));
