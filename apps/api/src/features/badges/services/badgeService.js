import db from '../../../db/index.js';
import { badges, userBadges } from '../schema.js';
import { users, topics, posts, userCredits, shopItems } from '../../../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Grant a badge to a user
 * @param {string} userId - User ID
 * @param {string} badgeId - Badge ID
 * @param {string} source - Source of the badge (e.g. 'system', 'admin', 'event')
 * @returns {Promise<object>} The newly granted badge record
 */
export async function grantBadge(userId, badgeId, source = 'system') {
  // Check if already owned
  const [existing] = await db
    .select()
    .from(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [granted] = await db
    .insert(userBadges)
    .values({
      userId,
      badgeId,
      source,
      earnedAt: new Date(),
    })
    .returning();

  return granted;
}

/**
 * Get all badges (optionally filtered by category)
 */
export async function getBadges(category = null) {
  let query = db.select().from(badges).where(eq(badges.isActive, true));
  
  if (category) {
    query = query.where(eq(badges.category, category));
  }
  
  return await query.orderBy(badges.displayOrder);
}

/**
 * Get badges owned by a user
 */
export async function getUserBadges(userId) {
  return await db
    .select({
      id: userBadges.id,
      earnedAt: userBadges.earnedAt,
      isDisplayed: userBadges.isDisplayed,
      badge: badges
    })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId))
    .orderBy(userBadges.displayOrder);
}

/**
 * Create a new badge
 */
export async function createBadge(data) {
  const [badge] = await db.insert(badges).values(data).returning();
  return badge;
}

/**
 * Update a badge
 */
export async function updateBadge(id, data) {
  const [badge] = await db
    .update(badges)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(badges.id, id))
    .returning();
  return badge;
}

// ... existing code ...

/**
 * Check and grant eligible badges for a user
 * @param {string} userId - User ID
 */
export async function checkBadgeConditions(userId) {
  // 1. Fetch User Stats
  const [user] = await db
    .select({
      id: users.id,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return;

  // Count Posts
  const [{ count: postCount }] = await db
    .select({ count: sql`count(*)` })
    .from(posts)
    .where(and(eq(posts.userId, userId), eq(posts.isDeleted, false)));

  // Count Topics
  const [{ count: topicCount }] = await db
    .select({ count: sql`count(*)` })
    .from(topics)
    .where(and(eq(topics.userId, userId), eq(topics.isDeleted, false)));

  // Count Likes Received (Sum of likeCount on user's posts)
  const [{ sum: likeCount }] = await db
    .select({ sum: sql`sum(${posts.likeCount})` })
    .from(posts)
    .where(and(eq(posts.userId, userId), eq(posts.isDeleted, false)));

  // Get Check-in Streak
  const [creditInfo] = await db
    .select({ streak: userCredits.checkInStreak })
    .from(userCredits)
    .where(eq(userCredits.userId, userId));
  const checkinStreak = creditInfo ? creditInfo.streak : 0;

  // Calculate Registration Days
  const daysRegistered = Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));

  // 2. Fetch All Active Badges
  const allBadges = await db
    .select()
    .from(badges)
    .where(eq(badges.isActive, true));

  // 3. Evaluate Conditions
  const newBadges = [];

  for (const badge of allBadges) {
    if (!badge.unlockCondition) continue;

    try {
      const condition = JSON.parse(badge.unlockCondition);
      let qualified = false;

      switch (condition.type) {
        case 'post_count':
          qualified = postCount >= (condition.threshold || 0);
          break;
        case 'topic_count':
          qualified = topicCount >= (condition.threshold || 0);
          break;
        case 'like_received_count':
          qualified = (Number(likeCount) || 0) >= (condition.threshold || 0);
          break;
        case 'checkin_streak':
          qualified = checkinStreak >= (condition.threshold || 0);
          break;
        case 'registration_days':
          qualified = daysRegistered >= (condition.threshold || 0);
          break;
        case 'manual':
        default:
          qualified = false;
      }

      if (qualified) {
        // Try to grant badge (idempotent)
        const result = await grantBadge(userId, badge.id, 'system_rule');
        if (result && result.earnedAt > new Date(Date.now() - 1000)) { 
           // If earnedAt is very recent, it means it was just inserted
           newBadges.push(badge);
        }
      }
    } catch (e) {
      console.error(`Failed to parse condition for badge ${badge.id}:`, e);
    }
  }

  return newBadges;
}

/**
 * Delete a badge
 */
export async function deleteBadge(id) {
  // 1. Find shop items that might be linked to this badge
  // We fetch all active badge-type items and check their metadata
  const allBadgeItems = await db
    .select()
    .from(shopItems)
    .where(and(eq(shopItems.type, 'badge'), eq(shopItems.isActive, true)));

  const itemsToDisable = [];
  for (const item of allBadgeItems) {
    try {
      if (!item.metadata) continue;
      let meta = item.metadata;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch (e) { /* ignore */ }
      }
      // Verify double encoding just in case
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch (e) { /* ignore */ }
      }

      if (meta && (meta.badgeId === id || meta.badgeId === Number(id))) {
        itemsToDisable.push(item.id);
      }
    } catch (e) {
      // ignore parse error
    }
  }

  // 2. Disable found items (Soft Disable)
  if (itemsToDisable.length > 0) {
    await db
      .update(shopItems)
      .set({ isActive: false, updatedAt: new Date() })
      .where(sql`${shopItems.id} IN ${itemsToDisable}`);
  }

  // 3. Delete the badge (Cascade will handle user_badges)
  await db.delete(badges).where(eq(badges.id, id));
  return true;
}


