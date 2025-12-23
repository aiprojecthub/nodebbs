import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

async function docsPlugin(fastify, opts) {
  // Register Swagger
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'NodeBBS API',
        description:
          '基于 Fastify、Drizzle ORM 和 PostgreSQL 构建的完整论坛 API',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:7100',
          description: '开发服务器',
        },
        {
          url: 'https://nodebbs.com',
          description: 'NodeBBS 官方服务器',
        },
      ],
      tags: [
        { name: 'auth', description: '认证端点' },
        { name: 'users', description: '用户管理' },
        { name: 'categories', description: '分类管理' },
        { name: 'topics', description: '话题操作' },
        { name: 'posts', description: '帖子操作' },
        { name: 'tags', description: '标签管理' },
        { name: 'notifications', description: '通知系统' },
        { name: 'moderation', description: '审核工具' },
        { name: 'system', description: '通用' },
        { name: 'blocked-users', description: '拉黑用户' },
        { name: 'messages', description: '站内信' },
        { name: 'search', description: '搜索功能' },
        { name: 'settings', description: '系统设置' },
        { name: 'oauth', description: 'OAuth 认证' },
        { name: 'email', description: '邮件服务' },
        { name: 'invitations', description: '邀请码管理' },
        { name: 'admin', description: '管理员专用接口' },
        { name: 'ledger', description: '账本系统' },
        { name: 'rewards', description: '积分奖励' },
        { name: 'shop', description: '积分商城' },
        { name: 'badges', description: '勋章系统' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          // ============ 通用 ============
          // 通用错误响应
          Error: {
            type: 'object',
            properties: {
              error: { type: 'string', description: '错误信息' },
              statusCode: { type: 'number', description: 'HTTP 状态码' },
              message: { type: 'string', description: '详细错误描述' },
            },
            required: ['error'],
          },
          // 分页元数据
          PaginationMeta: {
            type: 'object',
            properties: {
              page: { type: 'number', description: '当前页码', minimum: 1 },
              limit: {
                type: 'number',
                description: '每页条数',
                minimum: 1,
                maximum: 100,
              },
              total: { type: 'number', description: '总记录数', minimum: 0 },
            },
            required: ['page', 'limit', 'total'],
          },
          // 分页响应（泛型模板）
          PaginatedResponse: {
            type: 'object',
            properties: {
              items: { type: 'array', description: '数据列表' },
              page: { type: 'number', description: '当前页码' },
              limit: { type: 'number', description: '每页条数' },
              total: { type: 'number', description: '总记录数' },
            },
            required: ['items', 'page', 'limit', 'total'],
          },

          // ============ 用户相关 ============
          // 用户基础信息
          UserBase: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '用户ID' },
              username: { type: 'string', description: '用户名' },
              name: { type: 'string', description: '显示名称' },
              avatar: {
                type: 'string',
                nullable: true,
                description: '头像URL',
              },
              role: {
                type: 'string',
                enum: ['user', 'moderator', 'admin', 'vip'],
                description: '用户角色',
              },
              isBanned: { type: 'boolean', description: '是否被封禁' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },
          // 用户完整信息
          UserFull: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '用户ID' },
              username: { type: 'string', description: '用户名' },
              email: { type: 'string', description: '邮箱地址' },
              name: { type: 'string', description: '显示名称' },
              bio: { type: 'string', nullable: true, description: '个人简介' },
              avatar: { type: 'string', nullable: true, description: '头像URL' },
              role: {
                type: 'string',
                enum: ['user', 'moderator', 'admin', 'vip'],
                description: '用户角色',
              },
              isBanned: { type: 'boolean', description: '是否被封禁' },
              isEmailVerified: { type: 'boolean', description: '邮箱是否已验证' },
              isDeleted: { type: 'boolean', description: '是否已删除' },
              lastSeenAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '最后在线时间',
              },
              messagePermission: {
                type: 'string',
                enum: ['everyone', 'followers', 'disabled'],
                description: '站内信权限',
              },
              contentVisibility: {
                type: 'string',
                enum: ['everyone', 'authenticated', 'private'],
                description: '内容可见性',
              },
              usernameChangeCount: {
                type: 'number',
                description: '用户名修改次数',
              },
              usernameChangedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '上次用户名修改时间',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: '更新时间',
              },
            },
          },
          // 用户资料（含统计信息）
          UserProfile: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '用户ID' },
              username: { type: 'string', description: '用户名' },
              name: { type: 'string', description: '显示名称' },
              bio: { type: 'string', nullable: true, description: '个人简介' },
              avatar: { type: 'string', nullable: true, description: '头像URL' },
              role: {
                type: 'string',
                enum: ['user', 'moderator', 'admin', 'vip'],
                description: '用户角色',
              },
              messagePermission: {
                type: 'string',
                enum: ['everyone', 'followers', 'disabled'],
                description: '站内信权限',
              },
              contentVisibility: {
                type: 'string',
                enum: ['everyone', 'authenticated', 'private'],
                description: '内容可见性',
              },
              topicCount: { type: 'number', description: '话题数量' },
              postCount: { type: 'number', description: '回复数量' },
              followerCount: { type: 'number', description: '粉丝数量' },
              followingCount: { type: 'number', description: '关注数量' },
              isFollowing: { type: 'boolean', description: '当前用户是否关注' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },

          // ============ 话题相关 ============
          // 话题基础信息
          TopicBase: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '话题ID' },
              title: { type: 'string', description: '话题标题' },
              slug: { type: 'string', description: '话题标识' },
              categoryId: { type: 'number', description: '分类ID' },
              categoryName: { type: 'string', description: '分类名称' },
              categorySlug: { type: 'string', description: '分类标识' },
              categoryColor: { type: 'string', description: '分类颜色' },
              userId: { type: 'number', description: '作者ID' },
              username: { type: 'string', description: '作者用户名' },
              userAvatar: {
                type: 'string',
                nullable: true,
                description: '作者头像',
              },
              viewCount: { type: 'number', description: '浏览次数' },
              postCount: { type: 'number', description: '回复数量' },
              isPinned: { type: 'boolean', description: '是否置顶' },
              isClosed: { type: 'boolean', description: '是否关闭' },
              lastPostAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '最后回复时间',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },
          // 话题详情
          TopicDetail: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '话题ID' },
              title: { type: 'string', description: '话题标题' },
              slug: { type: 'string', description: '话题标识' },
              content: { type: 'string', description: '话题内容' },
              categoryId: { type: 'number', description: '分类ID' },
              categoryName: { type: 'string', description: '分类名称' },
              categorySlug: { type: 'string', description: '分类标识' },
              categoryColor: { type: 'string', description: '分类颜色' },
              userId: { type: 'number', description: '作者ID' },
              username: { type: 'string', description: '作者用户名' },
              userName: { type: 'string', description: '作者显示名称' },
              userAvatar: {
                type: 'string',
                nullable: true,
                description: '作者头像',
              },
              viewCount: { type: 'number', description: '浏览次数' },
              postCount: { type: 'number', description: '回复数量' },
              firstPostId: { type: 'number', description: '第一条帖子ID' },
              firstPostLikeCount: { type: 'number', description: '第一条帖子点赞数' },
              isFirstPostLiked: { type: 'boolean', description: '是否点赞第一条帖子' },
              isPinned: { type: 'boolean', description: '是否置顶' },
              isClosed: { type: 'boolean', description: '是否关闭' },
              isDeleted: { type: 'boolean', description: '是否删除' },
              approvalStatus: {
                type: 'string',
                enum: ['pending', 'approved', 'rejected'],
                description: '审核状态',
              },
              editCount: { type: 'number', description: '编辑次数' },
              editedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '编辑时间',
              },
              lastPostNumber: { type: 'number', description: '最后回复楼层' },
              lastPostAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '最后回复时间',
              },
              tags: {
                type: 'array',
                items: { $ref: '#/components/schemas/TagBase' },
                description: '话题标签',
              },
              isBookmarked: { type: 'boolean', description: '是否已收藏' },
              isSubscribed: { type: 'boolean', description: '是否已订阅' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: '更新时间',
              },
            },
          },

          // ============ 帖子相关 ============
          // 帖子基础信息
          PostBase: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '帖子ID' },
              topicId: { type: 'number', description: '话题ID' },
              topicTitle: { type: 'string', description: '话题标题' },
              topicSlug: { type: 'string', description: '话题标识' },
              userId: { type: 'number', description: '作者ID' },
              username: { type: 'string', description: '作者用户名' },
              userName: { type: 'string', description: '作者显示名称' },
              userAvatar: {
                type: 'string',
                nullable: true,
                description: '作者头像',
              },
              userRole: {
                type: 'string',
                enum: ['user', 'moderator', 'admin', 'vip'],
                description: '作者角色',
              },
              content: { type: 'string', description: '帖子内容' },
              postNumber: { type: 'number', description: '帖子序号（楼层）' },
              replyToPostId: {
                type: 'number',
                nullable: true,
                description: '回复的帖子ID',
              },
              likeCount: { type: 'number', description: '点赞数' },
              isLiked: { type: 'boolean', description: '是否已点赞' },
              approvalStatus: {
                type: 'string',
                enum: ['pending', 'approved', 'rejected'],
                description: '审核状态',
              },
              editCount: { type: 'number', description: '编辑次数' },
              editedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '编辑时间',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },
          // 帖子详情（含被回复帖子信息）
          PostDetail: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '帖子ID' },
              topicId: { type: 'number', description: '话题ID' },
              userId: { type: 'number', description: '作者ID' },
              username: { type: 'string', description: '作者用户名' },
              userName: { type: 'string', description: '作者显示名称' },
              userAvatar: {
                type: 'string',
                nullable: true,
                description: '作者头像',
              },
              userRole: {
                type: 'string',
                enum: ['user', 'moderator', 'admin', 'vip'],
                description: '作者角色',
              },
              content: { type: 'string', description: '帖子内容' },
              rawContent: { type: 'string', description: '原始内容' },
              postNumber: { type: 'number', description: '帖子序号' },
              replyToPostId: {
                type: 'number',
                nullable: true,
                description: '回复的帖子ID',
              },
              replyToPost: {
                type: 'object',
                nullable: true,
                description: '被回复的帖子信息',
              },
              likeCount: { type: 'number', description: '点赞数' },
              isLiked: { type: 'boolean', description: '是否已点赞' },
              isBlockedUser: { type: 'boolean', description: '是否被拉黑用户' },
              editCount: { type: 'number', description: '编辑次数' },
              editedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '编辑时间',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },

          // ============ 分类相关 ============
          // 分类基础信息
          CategoryBase: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '分类ID' },
              name: { type: 'string', description: '分类名称' },
              slug: { type: 'string', description: '分类标识' },
              description: {
                type: 'string',
                nullable: true,
                description: '分类描述',
              },
              color: { type: 'string', description: '分类颜色' },
              icon: {
                type: 'string',
                nullable: true,
                description: '分类图标',
              },
              parentId: {
                type: 'number',
                nullable: true,
                description: '父分类ID',
              },
              position: { type: 'number', description: '排序位置' },
              isPrivate: { type: 'boolean', description: '是否私有' },
              isFeatured: { type: 'boolean', description: '是否精选' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: '更新时间',
              },
            },
          },

          // ============ 标签相关 ============
          // 标签基础信息
          TagBase: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '标签ID' },
              name: { type: 'string', description: '标签名称' },
              slug: { type: 'string', description: '标签标识' },
              description: {
                type: 'string',
                nullable: true,
                description: '标签描述',
              },
              color: { type: 'string', description: '标签颜色' },
              topicCount: { type: 'number', description: '话题数量' },
            },
          },

          // ============ 通知相关 ============
          // 通知基础信息
          NotificationBase: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '通知ID' },
              type: {
                type: 'string',
                description: '通知类型',
                enum: ['reply', 'like', 'mention', 'topic_reply', 'message', 'follow'],
              },
              message: { type: 'string', description: '通知消息' },
              triggeredByUserId: {
                type: 'number',
                nullable: true,
                description: '触发用户ID',
              },
              topicId: {
                type: 'number',
                nullable: true,
                description: '相关话题ID',
              },
              postId: {
                type: 'number',
                nullable: true,
                description: '相关帖子ID',
              },
              isRead: { type: 'boolean', description: '是否已读' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },

          // ============ 站内信相关 ============
          // 站内信
          Message: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '消息ID' },
              senderId: { type: 'number', description: '发送者ID' },
              senderUsername: { type: 'string', description: '发送者用户名' },
              senderAvatar: {
                type: 'string',
                nullable: true,
                description: '发送者头像',
              },
              recipientId: { type: 'number', description: '接收者ID' },
              recipientUsername: { type: 'string', description: '接收者用户名' },
              subject: {
                type: 'string',
                nullable: true,
                description: '消息主题',
              },
              content: { type: 'string', description: '消息内容' },
              isRead: { type: 'boolean', description: '是否已读' },
              readAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '已读时间',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },

          // ============ 审核相关 ============
          // 举报信息
          Report: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '举报ID' },
              reportType: {
                type: 'string',
                enum: ['topic', 'post', 'user'],
                description: '举报类型',
              },
              targetId: { type: 'number', description: '被举报对象ID' },
              reporterId: { type: 'number', description: '举报人ID' },
              reporterUsername: { type: 'string', description: '举报人用户名' },
              reason: { type: 'string', description: '举报原因' },
              status: {
                type: 'string',
                enum: ['pending', 'resolved', 'dismissed'],
                description: '处理状态',
              },
              resolvedBy: {
                type: 'number',
                nullable: true,
                description: '处理人ID',
              },
              resolvedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '处理时间',
              },
              resolverNote: {
                type: 'string',
                nullable: true,
                description: '处理备注',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },
          // 审核日志
          ModerationLog: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '日志ID' },
              action: {
                type: 'string',
                description: '操作类型',
              },
              targetType: {
                type: 'string',
                enum: ['topic', 'post', 'user'],
                description: '目标类型',
              },
              targetId: { type: 'number', description: '目标ID' },
              moderatorId: { type: 'number', description: '操作者ID' },
              moderatorUsername: { type: 'string', description: '操作者用户名' },
              reason: {
                type: 'string',
                nullable: true,
                description: '操作原因',
              },
              previousStatus: {
                type: 'string',
                nullable: true,
                description: '操作前状态',
              },
              newStatus: {
                type: 'string',
                nullable: true,
                description: '操作后状态',
              },
              metadata: {
                type: 'string',
                nullable: true,
                description: '额外元数据（JSON）',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: '更新时间',
              },
            },
          },

          // ============ 验证码相关 ============
          // 验证码
          Verification: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '验证码ID' },
              identifier: { type: 'string', description: '标识符' },
              value: { type: 'string', description: '验证值' },
              type: { type: 'string', description: '验证类型' },
              userId: {
                type: 'number',
                nullable: true,
                description: '关联用户ID',
              },
              expiresAt: {
                type: 'string',
                format: 'date-time',
                description: '过期时间',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },

          // ============ 账本系统 (Ledger) ============
          // 货币定义
          SysCurrency: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '货币ID' },
              code: { type: 'string', description: '货币代码' },
              name: { type: 'string', description: '货币名称' },
              symbol: {
                type: 'string',
                nullable: true,
                description: '货币符号',
              },
              precision: { type: 'number', description: '精度（小数位）' },
              isActive: { type: 'boolean', description: '是否启用' },
              metadata: {
                type: 'string',
                nullable: true,
                description: '元数据',
              },
              config: {
                type: 'string',
                nullable: true,
                description: '配置信息',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },
          // 用户账户
          SysAccount: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '账户ID' },
              userId: { type: 'number', description: '用户ID' },
              currencyCode: { type: 'string', description: '货币代码' },
              balance: { type: 'number', description: '当前余额' },
              totalEarned: { type: 'number', description: '累计收入' },
              totalSpent: { type: 'number', description: '累计支出' },
              isFrozen: { type: 'boolean', description: '是否冻结' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: '更新时间',
              },
            },
          },
          // 交易流水
          SysTransaction: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '交易ID' },
              userId: { type: 'number', description: '用户ID' },
              accountId: { type: 'number', description: '账户ID' },
              currencyCode: { type: 'string', description: '货币代码' },
              amount: { type: 'number', description: '交易金额' },
              balanceAfter: { type: 'number', description: '交易后余额' },
              type: { type: 'string', description: '交易类型' },
              referenceType: {
                type: 'string',
                nullable: true,
                description: '关联类型',
              },
              referenceId: {
                type: 'string',
                nullable: true,
                description: '关联ID',
              },
              relatedUserId: {
                type: 'number',
                nullable: true,
                description: '相关用户ID',
              },
              description: {
                type: 'string',
                nullable: true,
                description: '描述',
              },
              metadata: {
                type: 'string',
                nullable: true,
                description: '元数据',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },

          // ============ 积分/奖励 (Rewards) ============
          // 用户签到
          UserCheckIn: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '记录ID' },
              userId: { type: 'number', description: '用户ID' },
              lastCheckInDate: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '最后签到时间',
              },
              checkInStreak: { type: 'number', description: '连续签到天数' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '首次签到时间',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: '更新时间',
              },
            },
          },
          // 帖子打赏
          PostReward: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '打赏ID' },
              postId: { type: 'number', description: '帖子ID' },
              fromUserId: { type: 'number', description: '打赏者ID' },
              toUserId: { type: 'number', description: '受赏者ID' },
              amount: { type: 'number', description: '金额' },
              currency: { type: 'string', description: '货币类型' },
              message: {
                type: 'string',
                nullable: true,
                description: '打赏留言',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '打赏时间',
              },
            },
          },

          // ============ 商城 (Shop) ============
          // 商品
          ShopItem: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '商品ID' },
              type: { type: 'string', description: '商品类型' },
              name: { type: 'string', description: '商品名称' },
              description: {
                type: 'string',
                nullable: true,
                description: '商品描述',
              },
              price: { type: 'number', description: '价格' },
              currencyCode: { type: 'string', description: '货币类型' },
              imageUrl: {
                type: 'string',
                nullable: true,
                description: '图片URL',
              },
              stock: {
                type: 'number',
                nullable: true,
                description: '库存',
              },
              isActive: { type: 'boolean', description: '是否上架' },
              metadata: {
                type: 'string',
                nullable: true,
                description: '元数据',
              },
              displayOrder: { type: 'number', description: '排序' },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },
          // 用户物品
          UserItem: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '记录ID' },
              userId: { type: 'number', description: '用户ID' },
              itemId: { type: 'number', description: '商品ID' },
              isEquipped: { type: 'boolean', description: '是否装备' },
              expiresAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '过期时间',
              },
              metadata: {
                type: 'string',
                nullable: true,
                description: '元数据',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '获取时间',
              },
            },
          },

          // ============ 勋章 (Badges) ============
          // 勋章定义
          Badge: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '勋章ID' },
              slug: { type: 'string', description: '勋章标识' },
              name: { type: 'string', description: '勋章名称' },
              description: {
                type: 'string',
                nullable: true,
                description: '勋章描述',
              },
              iconUrl: { type: 'string', description: '图标URL' },
              category: { type: 'string', description: '分类' },
              unlockCondition: {
                type: 'string',
                nullable: true,
                description: '解锁条件',
              },
              isActive: { type: 'boolean', description: '是否启用' },
              metadata: {
                type: 'string',
                nullable: true,
                description: '元数据',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },
          // 用户勋章
          UserBadge: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '记录ID' },
              userId: { type: 'number', description: '用户ID' },
              badgeId: { type: 'number', description: '勋章ID' },
              earnedAt: {
                type: 'string',
                format: 'date-time',
                description: '获得时间',
              },
              source: {
                type: 'string',
                nullable: true,
                description: '来源',
              },
              isDisplayed: { type: 'boolean', description: '是否展示' },
              displayOrder: { type: 'number', description: '展示顺序' },
            },
          },

          // ============ 邀请码相关 ============
          // 邀请码
          InvitationCode: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '邀请码ID' },
              code: { type: 'string', description: '邀请码' },
              createdBy: { type: 'number', description: '创建者ID' },
              createdByUsername: { type: 'string', description: '创建者用户名' },
              usedBy: {
                type: 'number',
                nullable: true,
                description: '使用者ID',
              },
              usedByUsername: {
                type: 'string',
                nullable: true,
                description: '使用者用户名',
              },
              status: {
                type: 'string',
                enum: ['active', 'used', 'expired'],
                description: '状态',
              },
              maxUses: { type: 'number', description: '最大使用次数' },
              usedCount: { type: 'number', description: '已使用次数' },
              expiresAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '过期时间',
              },
              usedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
                description: '使用时间',
              },
              note: {
                type: 'string',
                nullable: true,
                description: '备注',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
            },
          },

          // ============ 系统设置相关 ============
          // 系统设置
          SystemSetting: {
            type: 'object',
            properties: {
              id: { type: 'number', description: '设置ID' },
              key: { type: 'string', description: '设置键' },
              value: { type: 'string', description: '设置值' },
              valueType: {
                type: 'string',
                enum: ['string', 'boolean', 'number'],
                description: '值类型',
              },
              description: {
                type: 'string',
                nullable: true,
                description: '设置描述',
              },
              updatedBy: {
                type: 'number',
                nullable: true,
                description: '更新者ID',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: '创建时间',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: '更新时间',
              },
            },
          },

          // ============ OAuth 相关 ============
          // OAuth 提供商配置
          OAuthProvider: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'ID' },
              provider: {
                type: 'string',
                description: '提供商标识',
              },
              isEnabled: { type: 'boolean', description: '是否启用' },
              displayName: {
                type: 'string',
                nullable: true,
                description: '显示名称',
              },
              displayOrder: { type: 'number', description: '显示顺序' },
            },
          },

          // ============ 邮件相关 ============
          // 邮件提供商配置
          EmailProvider: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'ID' },
              provider: {
                type: 'string',
                description: '提供商类型',
              },
              isEnabled: { type: 'boolean', description: '是否启用' },
              isDefault: { type: 'boolean', description: '是否为默认' },
              displayName: {
                type: 'string',
                nullable: true,
                description: '显示名称',
              },
              fromEmail: {
                type: 'string',
                nullable: true,
                description: '发件人邮箱',
              },
              fromName: {
                type: 'string',
                nullable: true,
                description: '发件人名称',
              },
            },
          },
        },
        responses: {
          // 400 错误响应
          BadRequest: {
            description: '请求参数错误',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  invalidParam: {
                    value: {
                      error: '请求参数无效',
                      statusCode: 400,
                    },
                  },
                },
              },
            },
          },
          // 401 未认证响应
          Unauthorized: {
            description: '未认证或认证失败',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  notAuth: {
                    value: {
                      error: '需要登录',
                      statusCode: 401,
                    },
                  },
                },
              },
            },
          },
          // 403 无权限响应
          Forbidden: {
            description: '无权限访问',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  noPermission: {
                    value: {
                      error: '无权限执行此操作',
                      statusCode: 403,
                    },
                  },
                },
              },
            },
          },
          // 404 未找到响应
          NotFound: {
            description: '资源未找到',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  notFound: {
                    value: {
                      error: '请求的资源不存在',
                      statusCode: 404,
                    },
                  },
                },
              },
            },
          },
          // 500 服务器错误响应
          InternalServerError: {
            description: '服务器内部错误',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  serverError: {
                    value: {
                      error: '服务器内部错误',
                      statusCode: 500,
                    },
                  },
                },
              },
            },
          },
        },
        parameters: {
          // 分页参数 - 页码
          PageParam: {
            name: 'page',
            in: 'query',
            description: '页码',
            required: false,
            schema: {
              type: 'number',
              minimum: 1,
              default: 1,
            },
          },
          // 分页参数 - 每页数量
          LimitParam: {
            name: 'limit',
            in: 'query',
            description: '每页数量',
            required: false,
            schema: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
          // 搜索参数
          SearchParam: {
            name: 'search',
            in: 'query',
            description: '搜索关键词',
            required: false,
            schema: {
              type: 'string',
            },
          },
          // ID 路径参数
          IdParam: {
            name: 'id',
            in: 'path',
            description: '资源ID',
            required: true,
            schema: {
              type: 'number',
            },
          },
        },
      },
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'none',
      deepLinking: true,
    },
    staticCSP: true,
  });
}

export default fp(docsPlugin);
