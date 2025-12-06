import fp from 'fastify-plugin';
import creditsRoutes from './routes/index.js';

import { registerCreditListeners } from './listeners.js';


import { userEnricher } from '../../services/userEnricher.js';
import db from '../../db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { users, userItems, shopItems, userBadges, badges as badgeSchema } from '../../db/schema.js';
import { isCreditSystemEnabled } from './services/creditService.js';

/**
 * Credits Plugin
 * Handles credit system logic, routes, and event listeners.
 */
async function creditsPlugin(fastify, options) {
  // Register Credit Enrichment (Single)
  userEnricher.register('credits', async (user) => {
    // 1. Check if system enabled
    const isEnabled = await isCreditSystemEnabled();
    
    // Initialize defaults to ensure consistent shape
    if (user.avatarFrame === undefined) user.avatarFrame = null;
    if (user.badges === undefined) user.badges = [];

    if (!isEnabled) return;
    
    try {
        // 2. Fetch Avatar Frame
        const [foundAvatarFrame] = await db
          .select({
            id: userItems.id,
            itemType: shopItems.type,
            itemName: shopItems.name,
            itemMetadata: shopItems.metadata,
            imageUrl: shopItems.imageUrl,
          })
          .from(userItems)
          .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
          .where(
            and(
              eq(userItems.userId, user.id),
              eq(userItems.isEquipped, true),
              eq(shopItems.type, 'avatar_frame')
            )
          )
          .limit(1);

        user.avatarFrame = foundAvatarFrame || null;

        // 3. Fetch Badges
        const badges = await db
          .select({
            id: userBadges.id,
            badgeId: badgeSchema.id,
            name: badgeSchema.name,
            slug: badgeSchema.slug,
            iconUrl: badgeSchema.iconUrl,
            description: badgeSchema.description,
            isDisplayed: userBadges.isDisplayed,
            earnedAt: userBadges.earnedAt
          })
          .from(userBadges)
          .innerJoin(badgeSchema, eq(userBadges.badgeId, badgeSchema.id))
          .where(
            and(
              eq(userBadges.userId, user.id),
              eq(userBadges.isDisplayed, true)
            )
          )
          .orderBy(userBadges.displayOrder);
          
        user.badges = badges;
    } catch (err) {
        console.error('Error enriching user credits:', err);
    }
  });

  // Register Batch Enrichment
  userEnricher.registerBatch('credits', async (usersList) => {
      // 1. Check if system enabled
      const isEnabled = await isCreditSystemEnabled();

      // Initialize defaults for all users
      usersList.forEach(u => {
          if (u.avatarFrame === undefined) u.avatarFrame = null;
          if (u.badges === undefined) u.badges = [];
      });

      if (!isEnabled || usersList.length === 0) return;

      const userIds = usersList.map(u => u.id);

      try {
          // 2. Batch Fetch Avatar Frames
          const frames = await db
            .select({
              userId: userItems.userId,
              itemMetadata: shopItems.metadata,
            })
            .from(userItems)
            .innerJoin(shopItems, eq(userItems.itemId, shopItems.id))
            .where(
              and(
                inArray(userItems.userId, userIds),
                eq(userItems.isEquipped, true),
                eq(shopItems.type, 'avatar_frame')
              )
            );
          
          const frameMap = new Map();
          frames.forEach(f => frameMap.set(f.userId, f));

          // 3. Batch Fetch Badges
          // Note: Assuming we want distributed badges. If just top badges, logic might differ but basic list is okay.
          const badges = await db
            .select({
                userId: userBadges.userId,
                id: userBadges.id,
                badgeId: badgeSchema.id,
                name: badgeSchema.name,
                slug: badgeSchema.slug,
                iconUrl: badgeSchema.iconUrl,
                isDisplayed: userBadges.isDisplayed
            })
            .from(userBadges)
            .innerJoin(badgeSchema, eq(userBadges.badgeId, badgeSchema.id))
             .where(
                and(
                  inArray(userBadges.userId, userIds),
                  eq(userBadges.isDisplayed, true)
                )
             )
             .orderBy(userBadges.displayOrder);
          
          const badgeMap = new Map();
          badges.forEach(b => {
             if (!badgeMap.has(b.userId)) badgeMap.set(b.userId, []);
             badgeMap.get(b.userId).push(b);
          });

          // 4. Map back to users
          usersList.forEach(u => {
             if (frameMap.has(u.id)) {
                 u.avatarFrame = { itemMetadata: frameMap.get(u.id).itemMetadata };
             }
             if (badgeMap.has(u.id)) {
                 u.badges = badgeMap.get(u.id);
             }
          });

      } catch (err) {
          console.error('Error batch enriching user credits:', err);
      }
  });

  // Register routes
  fastify.register(creditsRoutes, { prefix: '/api/credits' });

  // Register event listeners
  await registerCreditListeners(fastify);

}

export default fp(creditsPlugin, {
  name: 'credits-plugin',
  dependencies: ['event-bus']
});
