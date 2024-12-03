import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { CallbackService } from './callback.service';
import { ON_TASK_VERIFIED_KEY } from 'src/constants';

@Injectable()
export class TaskEventListenerService implements OnModuleInit {
  private readonly logger = new Logger(TaskEventListenerService.name);
  private readonly listenerMap = new Map<
    string,
    { instance; methodName: string }[]
  >();

  constructor(
    private readonly redisService: RedisService,
    private readonly modulesContainer: ModulesContainer,
    private readonly callbackService: CallbackService,
  ) {}

  /**
   * Initialize the service and map all listeners.
   */
  async onModuleInit() {
    this.mapListeners();
    const client = this.redisService.getOrThrow('subscriber');

    // Subscribe to Redis Pub/Sub channel
    await client.subscribe('task_verified');
    client.on('message', this.handleRedisMessage.bind(this));
  }

  /**
   * Map all registered listeners into a Map for faster lookup.
   */
  private mapListeners() {
    for (const moduleRef of this.modulesContainer.values()) {
      for (const provider of moduleRef.providers.values()) {
        const instance = provider.instance;
        if (!instance) continue;

        const prototype = Object.getPrototypeOf(instance);
        const methodNames = Object.getOwnPropertyNames(prototype);

        for (const methodName of methodNames) {
          const metadata = Reflect.getMetadata(
            ON_TASK_VERIFIED_KEY,
            prototype[methodName],
          );

          if (metadata) {
            const taskName = metadata.taskName || '';
            if (!this.listenerMap.has(taskName)) {
              this.listenerMap.set(taskName, []);
            }
            this.listenerMap.get(taskName)?.push({ instance, methodName });
          }
        }
      }
    }

    this.logger.log(
      `Mapped listeners: ${JSON.stringify([...this.listenerMap.keys()])}`,
    );
  }

  /**
   * Handle incoming Redis messages.
   */
  private handleRedisMessage(channel: string, message: string) {
    if (channel === 'task_verified') {
      const eventData = JSON.parse(message);
      this.handleTaskVerifiedEvent(eventData);
    }
  }

  /**
   * Handle task verified events by invoking all matching listeners.
   */
  private async handleTaskVerifiedEvent(eventData: {
    taskId: string;
    queue: string;
  }) {
    const listeners = this.listenerMap.get(eventData.queue) || [];
    this.logger.log(
      `Found ${listeners.length} listeners for queue: ${eventData.queue}`,
    );

    await Promise.all(
      listeners.map(async ({ instance, methodName }) => {
        try {
          await this.callbackService.executeCallback(
            () => instance[methodName](eventData),
            eventData.taskId,
          );
        } catch (error) {
          this.logger.error(
            `Callback execution failed for task: ${eventData.taskId}. Error: ${error.message}`,
          );
        }
      }),
    );
  }
}
