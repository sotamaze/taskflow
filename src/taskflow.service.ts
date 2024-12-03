import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import {
  AddTaskOptions,
  TaskFlowModuleOptions,
  TaskMetadata,
} from './interfaces';
import { TASKFLOW_OPTIONS, TASKFLOW_STRATEGIES } from './constants';
import { Redis } from 'ioredis';
import { TaskFlowStatus } from './enums';
import { BaseStrategy } from './strategies';

@Injectable()
export class TaskFlowService {
  private readonly logger = new Logger(TaskFlowService.name);

  // Redis client for publishing messages and subscribing to channels
  private readonly subscriberClient: Redis;
  private readonly redisClient: Redis;

  constructor(
    @Inject(TASKFLOW_OPTIONS)
    private readonly moduleOptions: TaskFlowModuleOptions,

    @Inject(TASKFLOW_STRATEGIES)
    private readonly strategies: { [key: string]: BaseStrategy },

    private readonly redisService: RedisService,
  ) {
    this.redisClient = this.redisService.getOrThrow('client');
    this.subscriberClient = this.redisService.getOrThrow('subscriber');
  }

  /**
   * Add a new task to the queue
   * Generates OTP and sends notifications using registered strategies.
   *
   * @param queueName The queue to add the task to
   * @param data The data of the task
   * @param options Additional options for the task (e.g., priority, timeout, recipient)
   * @returns Metadata of the created task
   */
  async addTask<T = any>(
    queueName: string,
    data: T,
    options: AddTaskOptions,
  ): Promise<TaskMetadata<T>> {
    const taskId = this.generateTaskId();
    const taskMetadata = this.createTaskMetadata(
      taskId,
      queueName,
      data,
      options,
    );

    // Save task metadata in Redis
    await this.saveTaskMetadata(taskId, taskMetadata, options.ttl);

    // Execute strategies for allowed methods
    await this.executeStrategies(taskId, data, options);

    // Add task to queue
    await this.addToQueue(queueName, taskId, taskMetadata.priority);

    this.logger.log(`Added task ${taskId} to queue ${queueName}`);
    return taskMetadata;
  }

  /**
   * Verify a session by validating the OTP provided by the user.
   *
   * @param taskId The unique identifier of the session/task.
   * @param method The verification method (e.g., SMS, EMAIL, SMART_OTP).
   * @param otp The OTP provided by the user.
   * @returns True if the OTP is valid, otherwise false.
   */
  async verify(taskId: string, method: string, otp: string): Promise<boolean> {
    const otpKey = `otp:${taskId}:${method}`;
    const savedOtp = await this.redisClient.get(otpKey);

    if (!savedOtp || savedOtp !== otp) {
      this.logger.warn(
        `Verification failed for session ${taskId} and method ${method}`,
      );
      return false;
    }

    // Delete OTP key after successful verification
    await this.redisClient.del(otpKey);

    // Update task status to 'success'
    await this.updateTaskStatus(taskId, TaskFlowStatus.SUCCESS, method);

    // Log successful verification
    this.logger.log(`Session ${taskId} verified successfully via ${method}`);
    return true;
  }

  /**
   * Create task metadata
   * @param taskId The unique task ID
   * @param queueName The queue to add the task to
   * @param data The task data
   * @param options Task configuration options
   * @returns Task metadata
   */
  private createTaskMetadata<T>(
    taskId: string,
    queueName: string,
    data: T,
    options: AddTaskOptions,
  ): TaskMetadata<T> {
    return {
      id: taskId,
      queue: queueName,
      data: data,
      recipient: options.recipient,
      status: TaskFlowStatus.PENDING,
      priority: options.priority || 0,
      timeout: options.timeout || this.moduleOptions.jobTimeout || 30000,
      timestamp: Date.now(),
      ttl: options.ttl,
    };
  }

  /**
   * Save task metadata in Redis
   * @param taskId The task ID
   * @param metadata The task metadata
   * @param ttl Time-to-live for the task
   */
  private async saveTaskMetadata<T>(
    taskId: string,
    metadata: TaskMetadata<T>,
    ttl?: number,
  ): Promise<void> {
    await this.redisClient.hmset(`task:${taskId}`, metadata);
    if (ttl) {
      await this.redisClient.expire(`task:${taskId}`, Math.ceil(ttl / 1000));
    }
  }

  /**
   * Execute strategies for allowed methods
   * @param taskId The task ID
   * @param data The task data
   * @param options Task options
   */
  private async executeStrategies<T>(
    taskId: string,
    data: T,
    options: AddTaskOptions,
  ): Promise<void> {
    for (const method of options.allowedMethods) {
      const strategy = this.strategies[method];
      if (!strategy) {
        this.logger.warn(`No strategy found for method: ${method}`);
        continue;
      }

      // Generate OTP and send notification
      const otp = await strategy.generate({
        ...data,
        recipient: options.recipient,
      });

      // Send notification using the strategy
      await strategy.send(options.recipient, otp);

      // Save OTP in Redis
      await this.redisClient.set(
        `otp:${taskId}:${method}`,
        otp,
        'EX',
        Math.ceil(options.ttl || 30000 / 1000),
      );
    }
  }

  /**
   * Add task to queue
   * @param queueName The queue to add the task to
   * @param taskId The task ID
   * @param priority The task priority
   */
  private async addToQueue(
    queueName: string,
    taskId: string,
    priority: number,
  ): Promise<void> {
    const queueKey =
      priority > 0 ? `priority_queue:${queueName}` : `queue:${queueName}`;
    const queueMethod = priority > 0 ? 'zadd' : 'rpush';
    await this.redisClient[queueMethod](queueKey, priority, taskId);
  }

  /**
   * Update the status of a task in Redis
   * @param taskId The task ID
   * @param status The new status
   * @param method The verification method used
   */
  private async updateTaskStatus(
    taskId: string,
    status: TaskFlowStatus,
    method: string,
  ): Promise<void> {
    await this.redisClient.hmset(`task:${taskId}`, {
      status,
      verifiedAt: Date.now(),
      verificationMethod: method,
    });
  }

  /**
   * Generate a unique task ID
   * @returns The generated task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
