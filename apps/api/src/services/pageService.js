import db from '../db/index.js';
import { pages } from '../db/schema.js';
import { and, count, desc, eq, ilike, ne, or } from 'drizzle-orm';

export const PAGE_TYPES = ['text', 'html', 'markdown', 'json'];

export const RESERVED_SLUG_PREFIXES = [
  'api',
  'auth',
  'dashboard',
  'profile',
  'create',
  'categories',
  'tags',
  'topic',
  'users',
  'search',
  'about',
  'reference',
  'uploads',
  'docs',
  '_next',
  'not-found-render',
  'page-render',
];

export function normalizePageSlug(input) {
  return String(input || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/')
    .toLowerCase();
}

function isReservedSlug(slug) {
  return RESERVED_SLUG_PREFIXES.some((prefix) => (
    slug === prefix || slug.startsWith(`${prefix}/`)
  ));
}

export function validatePagePayload(payload, { partial = false } = {}) {
  const normalized = {
    ...payload,
  };

  if (payload.slug !== undefined) {
    normalized.slug = normalizePageSlug(payload.slug);
  }

  if (payload.type !== undefined) {
    normalized.type = String(payload.type).trim().toLowerCase();
  }

  if (payload.content !== undefined) {
    normalized.content = String(payload.content);
  }

  if (!partial || payload.title !== undefined) {
    const title = String(payload.title || '').trim();
    if (!title) {
      throw new Error('页面标题不能为空');
    }
    normalized.title = title;
  }

  if (!partial || payload.slug !== undefined) {
    if (!normalized.slug) {
      throw new Error('页面路径不能为空');
    }
    if (!/^[a-z0-9._/-]+$/.test(normalized.slug)) {
      throw new Error('页面路径仅支持小写字母、数字、点、下划线、短横线和斜杠');
    }
    if (normalized.slug.includes('..')) {
      throw new Error('页面路径不能包含连续点号');
    }
    if (isReservedSlug(normalized.slug)) {
      throw new Error('页面路径与系统路由冲突，请更换');
    }
  }

  if (!partial || payload.type !== undefined) {
    if (!PAGE_TYPES.includes(normalized.type)) {
      throw new Error('页面类型不支持');
    }
  }

  if (!partial || payload.content !== undefined) {
    if (normalized.content === undefined || normalized.content === null || normalized.content.trim() === '') {
      throw new Error('页面内容不能为空');
    }
  }

  if (payload.isPublished !== undefined) {
    normalized.isPublished = Boolean(payload.isPublished);
  }

  if (payload.standalone !== undefined) {
    normalized.standalone = Boolean(payload.standalone);
  }

  if (normalized.type === 'json' && normalized.content !== undefined) {
    try {
      JSON.parse(normalized.content);
    } catch (error) {
      throw new Error('JSON 页面内容不是合法 JSON');
    }
  }

  return normalized;
}

export async function assertPageSlugAvailable(slug, excludeId = null) {
  const conditions = [eq(pages.slug, slug)];

  if (excludeId !== null) {
    conditions.push(ne(pages.id, excludeId));
  }

  const [existing] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new Error('页面路径已存在');
  }
}

export async function listAdminPages({
  page = 1,
  limit = 20,
  search = '',
  type = '',
  status = '',
} = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const conditions = [];

  if (search.trim()) {
    const escaped = search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
    conditions.push(or(
      ilike(pages.title, `%${escaped}%`),
      ilike(pages.slug, `%${escaped}%`)
    ));
  }

  if (type && PAGE_TYPES.includes(type)) {
    conditions.push(eq(pages.type, type));
  }

  if (status === 'published') {
    conditions.push(eq(pages.isPublished, true));
  }

  if (status === 'draft') {
    conditions.push(eq(pages.isPublished, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let itemsQuery = db
    .select()
    .from(pages)
    .orderBy(desc(pages.id))
    .limit(safeLimit)
    .offset((safePage - 1) * safeLimit);

  let totalQuery = db
    .select({ count: count() })
    .from(pages);

  if (whereClause) {
    itemsQuery = itemsQuery.where(whereClause);
    totalQuery = totalQuery.where(whereClause);
  }

  const [items, totalResult] = await Promise.all([
    itemsQuery,
    totalQuery.then((result) => result[0]),
  ]);

  return {
    items,
    total: totalResult?.count || 0,
    page: safePage,
    limit: safeLimit,
  };
}

export async function getAdminPageById(id) {
  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.id, id))
    .limit(1);

  return page || null;
}

export async function getPageBySlug(slug) {
  const normalizedSlug = normalizePageSlug(slug);
  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, normalizedSlug))
    .limit(1);

  return page || null;
}

export async function createPage(payload) {
  const data = validatePagePayload(payload);
  await assertPageSlugAvailable(data.slug);

  const [page] = await db
    .insert(pages)
    .values(data)
    .returning();

  return page;
}

export async function updatePage(id, payload) {
  const data = validatePagePayload(payload, { partial: true });
  const current = await getAdminPageById(id);

  if (!current) {
    return null;
  }

  if (data.slug) {
    await assertPageSlugAvailable(data.slug, id);
  }

  const [page] = await db
    .update(pages)
    .set(data)
    .where(eq(pages.id, id))
    .returning();

  return page || null;
}

export async function deletePage(id) {
  const [page] = await db
    .delete(pages)
    .where(eq(pages.id, id))
    .returning();

  return page || null;
}
