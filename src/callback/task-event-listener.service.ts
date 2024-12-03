import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { TaskMetadata } from 'src/interfaces';

@Injectable()
export class TaskEventListenerService implements OnModuleInit {
  private readonly logger = new Logger(TaskEventListenerService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2, // Inject EventEmitter
  ) {}

  /**
   * Initialize the service and subscribe to Redis Pub/Sub channel.
   */
  async onModuleInit() {
    const redisClient = this.redisService.getOrThrow('subscriber');

    // Subscribe to the 'task_verified' Redis channel
    await redisClient.subscribe('task_verified');
    redisClient.on('message', this.handleRedisMessage.bind(this));
  }

  /**
   * Handle incoming messages from Redis Pub/Sub.
   * @param channel The channel name
   * @param message The message received
   */
  private handleRedisMessage(channel: string, message: string) {
    if (channel === 'task_verified') {
      const eventData = JSON.parse(message);

      // Emit the event through EventEmitter
      this.emitTaskVerifiedEvent(eventData);
    }
  }

  /**
   * Emit the task verified event through NestJS EventEmitter.
   * @param metadata The event data containing task information.
   */
  private emitTaskVerifiedEvent(metadata: TaskMetadata) {
    const eventName = `task.verified.${metadata.queue}`;
    this.logger.log(`Emitting event: ${eventName} for taskId: ${metadata.id}`);
    this.eventEmitter.emit(eventName, metadata); // Emit event to EventEmitter
  }
}
