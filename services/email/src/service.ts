import type { Store } from "./store.js";
import type { NewsletterAdapter } from "./adapters.js";
import type { Broadcast, Transactional } from "./contracts.js";
export class EmailService {
  constructor(
    readonly store: Store,
    private newsletter: NewsletterAdapter,
    private transaction: (
      input: Transactional,
    ) => Promise<{ providerId: string }>,
    private sendsEnabled: boolean,
  ) {}
  async broadcast(input: Broadcast) {
    if (!this.sendsEnabled) throw new Error("Delivery is disabled");
    const previous = this.store.begin(input.id, input, {
      key: input.publicationKey,
      resendReason: input.resendReason,
    });
    if (previous) return previous;
    try {
      const emails = this.store.recipients(input.audiences);
      if (!emails.length) throw new Error("No eligible recipients");
      const prepared = await this.newsletter.prepare(
        input.id,
        emails,
        (email, reason) =>
          this.store.suppress(
            email,
            reason,
            "kit-reconcile",
            new Date().toISOString(),
          ),
      );
      const current = this.store.recipients(input.audiences);
      if (
        !prepared.eligible.length ||
        prepared.eligible.some((email) => !current.includes(email))
      )
        throw new Error(
          "Audience changed during preparation; manual review required",
        );
      // Never retry an uncertain provider mutation automatically.
      const result = {
        ...(await this.newsletter.send(input, prepared.tagId)),
        audienceCount: prepared.eligible.length,
      };
      this.store.finish(input.id, "accepted", result);
      return { status: "accepted", result };
    } catch (error) {
      this.store.finish(input.id, "needs_review", {});
      throw error;
    }
  }
  async transactional(input: Transactional) {
    if (!this.sendsEnabled) throw new Error("Delivery is disabled");
    const previous = this.store.begin(input.id, input);
    if (previous) return previous;
    try {
      if (this.store.suppressed(input.to, true))
        throw new Error("Recipient suppressed");
      const result = await this.transaction(input);
      this.store.finish(input.id, "accepted", result);
      return { status: "accepted", result };
    } catch (error) {
      this.store.finish(input.id, "needs_review", {});
      throw error;
    }
  }
}
