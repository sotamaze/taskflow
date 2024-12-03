import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { CallbackService } from './callback.service';
import { ON_TASK_VERIFIED_KEY } from 'src/constants';

@Injectable()
export class TaskEventListenerService implements OnModuleInit {
  private readonly logger = new Logger(TaskEventListenerService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly modulesContainer: ModulesContainer,
    private readonly callbackService: CallbackService,
  ) {}

  /**
   * Initialize the service and subscribe to Redis Pub/Sub channel.
   */
  async onModuleInit() {
    const client = this.redisService.getOrThrow();

    // Subscribe to the 'task_verified' Redis channel
    await client.subscribe('task_verified');
    client.on('message', this.handleRedisMessage.bind(this));
  }

  /**
   * Handle incoming messages from Redis Pub/Sub.
   * @param channel The channel name
   * @param message The message received
   */
  private handleRedisMessage(channel: string, message: string) {
    if (channel === 'task_verified') {
      const eventData = JSON.parse(message);
      this.handleTaskVerifiedEvent(eventData);
    }
  }

  /**
   * Handle task verified events by invoking registered listeners.
   * @param eventData Event data containing task information
   */
  private async handleTaskVerifiedEvent(eventData: {
    taskId: string;
    queue: string;
  }) {
    const listeners = this.getRegisteredListeners(eventData.queue);

    // Execute all registered listeners for the task queue
    for (const { instance, methodName } of listeners) {
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
    }
  }

  /**
   * Retrieve all registered listeners for a specific task queue.
   * @param queue The queue name to match listeners
   * @returns List of matching listeners
   */
  private getRegisteredListeners(queue: string) {
    const listeners = [];

    // Iterate over all modules and providers to find listeners
    for (const moduleRef of this.modulesContainer.values()) {
      for (const provider of moduleRef.providers.values()) {
        const instance = provider.instance;
        if (!instance) continue;

        const prototype = Object.getPrototypeOf(instance);
        const methodNames = Object.getOwnPropertyNames(prototype);

        // Iterate over all methods in the provider
        for (const methodName of methodNames) {
          const metadata = Reflect.getMetadata(
            ON_TASK_VERIFIED_KEY,
            prototype[methodName],
          );

          // Check if the method is a registered listener
          if (metadata && (!metadata.taskName || metadata.taskName === queue)) {
            listeners.push({ instance, methodName });
          }
        }
      }
    }

    // Return all matching listeners
    return listeners;
  }
}
