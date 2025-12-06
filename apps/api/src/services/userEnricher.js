
/**
 * Service to allow different features to enrich the user object
 * with additional data (e.g. badges, credits, settings).
 */
class UserEnricher {
  constructor() {
    this.enrichers = [];
    this.batchEnrichers = [];
  }

  /**
   * Register a new enricher.
   * @param {string} name - Unique name for the enricher.
   * @param {function} callback - Async function (user) => Promise<void>. Mutates user object.
   */
  register(name, callback) {
    console.log(`[UserEnricher] Registered: ${name}`);
    this.enrichers.push({ name, callback });
  }

  /**
   * Register a new batch enricher.
   * @param {string} name - Unique name for the enricher.
   * @param {function} callback - Async function (users[]) => Promise<void>. Mutates user objects in the array.
   */
  registerBatch(name, callback) {
    console.log(`[UserEnricher] Registered Batch: ${name}`);
    this.batchEnrichers.push({ name, callback });
  }

  /**
   * Run all registered enrichers on the user object.
   * @param {object} user - The user object to enrich.
   * @param {object} context - Optional context (e.g. request object).
   */
  async enrich(user, context = {}) {
    if (!user) return;

    // Run enrichers in parallel for performance
    await Promise.all(
      this.enrichers.map(async ({ name, callback }) => {
        try {
          await callback(user, context);
        } catch (err) {
          console.error(`[UserEnricher] Error in ${name}:`, err);
          // Don't fail the whole request if one enricher fails
        }
      })
    );
    
    return user;
  }

  /**
   * Run all registered batch enrichers on a list of users.
   * @param {object[]} users - The list of user objects to enrich.
   * @param {object} context - Optional context.
   */
  async enrichMany(users, context = {}) {
    if (!users || users.length === 0) return users;

    // Run batch enrichers in parallel
    await Promise.all(
      this.batchEnrichers.map(async ({ name, callback }) => {
        try {
          await callback(users, context);
        } catch (err) {
          console.error(`[UserEnricher] Error in batch ${name}:`, err);
        }
      })
    );

    return users;
  }
}

export const userEnricher = new UserEnricher();
