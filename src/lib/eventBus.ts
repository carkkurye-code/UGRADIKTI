import { DomainEvent, DomainEventType } from './domainEvents';

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

interface QueuedEvent {
  event: DomainEvent;
  retries: number;
  maxRetries: number;
  lastError?: string;
}

class EventBus {
  private handlers: Map<DomainEventType, Set<EventHandler>> = new Map();
  private eventQueue: QueuedEvent[] = [];
  private isProcessingQueue = false;

  /**
   * Subscribe a handler to a specific domain event type
   */
  public subscribe<T = any>(eventType: DomainEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.unsubscribe(eventType, handler as EventHandler);
  }

  /**
   * Unsubscribe a handler from a domain event type
   */
  public unsubscribe(eventType: DomainEventType, handler: EventHandler): void {
    const set = this.handlers.get(eventType);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  private publishDepth = 0;

  /**
   * Publish an event synchronously to all active subscribers
   */
  public async publish<T = any>(event: DomainEvent<T>): Promise<void> {
    if (this.publishDepth > 10) {
      console.warn(`[EventBus] High recursion depth (${this.publishDepth}) detected for event ${event.type}. Deferring execution to async task.`);
      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          const savedDepth = this.publishDepth;
          this.publishDepth = 0;
          try {
            await this.publish(event);
          } catch (err) {
            console.error(`[EventBus] Deferred publish error for event ${event.type}:`, err);
          } finally {
            this.publishDepth = savedDepth;
            resolve();
          }
        }, 0);
      });
    }

    this.publishDepth++;
    try {
      console.log(`[EventBus] Publishing event: ${event.type} (ID: ${event.id})`, event.payload);
      const subscribers = this.handlers.get(event.type);
      if (!subscribers || subscribers.size === 0) {
        return;
      }

      const promises: Promise<void>[] = [];
      subscribers.forEach((handler) => {
        try {
          const result = handler(event);
          if (result instanceof Promise) {
            promises.push(
              result.catch((err) => {
                console.error(`[EventBus] Handler error for event ${event.type}:`, err);
                this.queue(event, 3, err?.message || String(err));
              })
            );
          }
        } catch (err: any) {
          console.error(`[EventBus] Sync handler error for event ${event.type}:`, err);
          this.queue(event, 3, err?.message || String(err));
        }
      });

      await Promise.allSettled(promises);
    } finally {
      this.publishDepth = Math.max(0, this.publishDepth - 1);
    }
  }

  /**
   * Alias for publish()
   */
  public async emit<T = any>(event: DomainEvent<T>): Promise<void> {
    return this.publish(event);
  }

  /**
   * Add a failed or background event to the retry queue
   */
  public queue(event: DomainEvent, maxRetries: number = 2, initialError?: string): void {
    // Prevent duplicate event queuing to stop exponential loop recursion
    const exists = this.eventQueue.some(item => item.event.id === event.id);
    if (exists) {
      return;
    }

    console.warn(`[EventBus] Queueing event for retry: ${event.type} (ID: ${event.id})`);
    this.eventQueue.push({
      event,
      retries: 0,
      maxRetries,
      lastError: initialError,
    });

    this.scheduleQueueProcessing();
  }

  /**
   * Schedule queue processing asynchronously with setTimeout to prevent call stack overflow
   */
  private scheduleQueueProcessing(): void {
    if (this.isProcessingQueue) return;
    setTimeout(() => {
      this.processQueue();
    }, 3000);
  }

  /**
   * Retry queued events
   */
  public async retry(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    console.log(`[EventBus] Retrying ${this.eventQueue.length} queued events...`);
    await this.processQueue(true);
  }

  /**
   * Internal queue processor with safe batch snapshotting
   */
  private async processQueue(forceRetry: boolean = false): Promise<void> {
    if (this.isProcessingQueue || this.eventQueue.length === 0) return;
    this.isProcessingQueue = true;

    try {
      // Snapshot and clear current batch to prevent modifying array during iteration
      const currentBatch = this.eventQueue.splice(0);
      const remainingQueue: QueuedEvent[] = [];

      for (const item of currentBatch) {
        if (item.retries >= item.maxRetries && !forceRetry) {
          console.error(`[EventBus] Max retries reached for event ${item.event.type} (${item.event.id}). Dropping event.`);
          continue;
        }

        item.retries += 1;
        try {
          const subscribers = this.handlers.get(item.event.type);
          if (subscribers) {
            for (const handler of Array.from(subscribers)) {
              await handler(item.event);
            }
          }
        } catch (err: any) {
          console.error(`[EventBus] Retry failed for event ${item.event.type} (Attempt ${item.retries}):`, err);
          item.lastError = err?.message || String(err);
          if (item.retries < item.maxRetries) {
            remainingQueue.push(item);
          }
        }
      }

      if (remainingQueue.length > 0) {
        this.eventQueue.push(...remainingQueue);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }
}

export const eventBus = new EventBus();
