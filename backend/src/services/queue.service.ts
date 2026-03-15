/**
 * Rate-limit-aware concurrency queue for API calls.
 * Limits concurrent requests and applies exponential backoff on 429s.
 */

type Task<T> = () => Promise<T>;

interface QueuedTask<T> {
  task: Task<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
}

class RateLimitQueue {
  private maxConcurrent: number;
  private running = 0;
  private queue: QueuedTask<any>[] = [];
  private backoffUntil = 0; // timestamp — pause all tasks until this time

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  enqueue<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.drain();
    });
  }

  private async drain() {
    while (this.queue.length > 0 && this.running < this.maxConcurrent) {
      // Wait for backoff if active
      const now = Date.now();
      if (this.backoffUntil > now) {
        const wait = this.backoffUntil - now;
        console.log(`[Queue] Global backoff active, waiting ${(wait / 1000).toFixed(1)}s...`);
        setTimeout(() => this.drain(), wait);
        return;
      }

      const item = this.queue.shift();
      if (!item) return;

      this.running++;
      this.execute(item).finally(() => {
        this.running--;
        this.drain();
      });
    }
  }

  private async execute<T>(item: QueuedTask<T>) {
    try {
      const result = await item.task();
      item.resolve(result);
    } catch (error: any) {
      const isRateLimit =
        error.status === 429 ||
        error.message?.includes('429') ||
        error.message?.includes('RESOURCE_EXHAUSTED');

      if (isRateLimit) {
        // Apply global backoff — pause all tasks
        const backoffMs = 10000 + Math.random() * 5000; // 10-15s
        this.backoffUntil = Math.max(this.backoffUntil, Date.now() + backoffMs);
        console.warn(`[Queue] Rate limited. Global backoff for ${(backoffMs / 1000).toFixed(1)}s. Queue depth: ${this.queue.length}`);

        // Re-queue this task at the front
        this.queue.unshift(item);
      } else {
        item.reject(error);
      }
    }
  }
}

// Singleton — max 2 concurrent image generation calls
export const imageQueue = new RateLimitQueue(2);
