import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import {
  AddTaskOptions,
  TaskFlowModuleOptions,
  TaskFlowRecipients,
  TaskMetadata,
} from './interfaces';
import { TASKFLOW_OPTIONS, TASKFLOW_STRATEGIES } from './constants';
import { TaskFlowMethods, TaskFlowStatus } from './enums';
import { BaseStrategy } from './strategies';

@Injectable()
export class TaskFlowService {
  private readonly logger = new Logger(TaskFlowService.name);
  private readonly redisClient: Redis;

  constructor(
    @Inject(TASKFLOW_OPTIONS)
    private readonly moduleOptions: TaskFlowModuleOptions,

    @Inject(TASKFLOW_STRATEGIES)
    private readonly strategies: { [key: string]: BaseStrategy },

    private readonly redisService: RedisService,
  ) {
    // Initialize Redis clients for different operations
    this.redisClient = this.redisService.getOrThrow('client');
  }

  /**
   * Create and manage a new task with OTP generation
   * @param queueName Target queue for task processing
   * @param data Task payload
   * @param options Configuration for task handling
   * @returns Metadata of the created task
   */
  async addTask<T = any>(
    queueName: string,
    data: T,
    options: AddTaskOptions,
  ): Promise<TaskMetadata<T>> {
    // Generate unique task identifier
    try {
      const taskId = this.generateTaskId();

      // Prepare task metadata
      const taskMetadata = this.createTaskMetadata(
        taskId,
        queueName,
        data,
        options,
      );

      // Persist task details and execute verification strategies
      await this.saveTaskMetadata(taskId, taskMetadata, options.ttl);
      await this.executeStrategies(taskId, data, options);
      await this.addToQueue(queueName, taskId, taskMetadata.priority);

      this.logger.log(`Task ${taskId} added to queue ${queueName}`);
      return taskMetadata;

      // When an error occurs during task creation
    } catch (error) {
      this.logger.error('Error adding task:', error.stack);
    }
  }

  /**
   * Verify task OTP and update task status
   * @param taskId Unique task identifier
   * @param method Verification method
   * @param otp One-time password
   * @returns Verification result
   */
  async verify(taskId: string, method: string, otp: string): Promise<boolean> {
    try {
      const otpKey = `otp:${taskId}:${method}`;
      const savedOtp = await this.redisClient.get(otpKey);

      // Validate OTP
      if (!savedOtp || savedOtp !== otp) {
        this.logger.warn(
          `Verification failed for task ${taskId}, method ${method}`,
        );
        return false;
      }

      // Clean up and update task status
      const [, metadata] = await Promise.all([
        this.redisClient.del(otpKey),
        this.getTaskMetadata(taskId),
      ]);

      // Mark task as successful and publish verification event
      await this.updateTaskStatus(taskId, TaskFlowStatus.SUCCESS, method);
      await this.redisClient.publish('task_verified', JSON.stringify(metadata));

      // Return verification result
      this.logger.log(`Task ${taskId} verified via ${method}`);
      return true;

      // When an error occurs during task verification
    } catch {
      return false;
    }
  }

  /**
   * Resend OTP for a specific task
   * @param taskId Unique identifier for the task
   * @param method Verification method to use for OTP
   */
  async resendOtp(taskId: string, method: string): Promise<void> {
    try {
      // Fetch task metadata
      const metadata = await this.getTaskMetadata(taskId);

      // Validate required parameters
      if (!this.isValidOtpRequest(metadata, method)) {
        return;
      }

      // Select and execute OTP strategy
      const strategy = this.strategies[method];
      const otp = await this.generateAndSendOtp(strategy, metadata);

      // Cache OTP with appropriate expiration
      await this.cacheOtp(taskId, method, otp, metadata);

      this.logger.log(`OTP resent for task ${taskId} via ${method}`);
    } catch (error) {
      this.logger.error(`OTP resend failed for task ${taskId}:`, error);
    }
  }

  /**
   * Validate OTP request parameters
   */
  private isValidOtpRequest(metadata: TaskMetadata, method: string): boolean {
    if (!metadata.recipient || !method) {
      this.logger.warn('Missing recipient or method');
      return false;
    }

    if (!this.strategies[method]) {
      this.logger.warn(`Invalid OTP method: ${method}`);
      return false;
    }

    return true;
  }

  /**
   * Generate and send OTP using selected strategy
   */
  private async generateAndSendOtp(
    strategy: BaseStrategy,
    metadata: TaskMetadata,
  ): Promise<string> {
    const otp = await strategy.generate({
      ...metadata.data,
      recipient: metadata.recipient,
    });
    await strategy.send(metadata.recipient, otp);
    return otp;
  }

  /**
   * Cache OTP in Redis with appropriate expiration
   */
  private async cacheOtp(
    taskId: string,
    method: string,
    otp: string,
    metadata: TaskMetadata,
  ): Promise<void> {
    const ttl = metadata.ttl || this.moduleOptions.jobTimeout || 30000;
    await this.redisClient.set(
      `otp:${taskId}:${method}`,
      otp,
      'EX',
      Math.ceil(ttl / 1000),
    );
  }

  /**
   * Update recipient for a task and resend OTPs
   * @param taskId Unique task identifier
   * @param newRecipient Updated recipient information
   */
  async updateRecipient(
    taskId: string,
    newRecipient: TaskFlowRecipients,
  ): Promise<void> {
    try {
      // Fetch and update task metadata
      const metadata = await this.getTaskMetadata(taskId);
      metadata.recipient = newRecipient;

      // Persist updated recipient
      await this.persistUpdatedRecipient(taskId, newRecipient);

      // Resend OTP for all strategies
      await this.resendOtpsForAllMethods(taskId);

      this.logger.log(`Recipient updated for task ${taskId}`);
    } catch (error) {
      this.logger.error(`Recipient update failed for task ${taskId}:`, error);
    }
  }

  /**
   * Persist updated recipient to Redis
   */
  private async persistUpdatedRecipient<T>(
    taskId: string,
    newRecipient: T,
  ): Promise<void> {
    await this.redisClient.hmset(`task:${taskId}`, {
      recipient: JSON.stringify(newRecipient),
    });
  }

  /**
   * Resend OTPs for all available methods
   */
  private async resendOtpsForAllMethods(taskId: string): Promise<void> {
    // Clean up existing OTP keys first
    await this.cleanupOtpKeys(taskId);

    // Send new OTPs for each strategy
    const otpPromises = Object.keys(this.strategies).map((method) =>
      this.resendOtp(taskId, method),
    );

    // Wait for all OTPs to be resent
    await Promise.all(otpPromises);
  }

  // Create task metadata with default values and configuration
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

  // Persist task metadata in Redis with optional TTL
  private async saveTaskMetadata<T>(
    taskId: string,
    metadata: TaskMetadata<T>,
    ttl?: number,
  ): Promise<void> {
    // Convert complex objects to JSON strings
    const serializedMetadata = {
      ...metadata,
      data: JSON.stringify(metadata.data),
      recipient: JSON.stringify(metadata.recipient),
      ttl: metadata.ttl ? metadata.ttl : -1,
    };

    // Store task metadata in Redis
    await this.redisClient.hmset(`task:${taskId}`, serializedMetadata);

    // Set expiration time for task metadata
    if (ttl) {
      await this.redisClient.expire(`task:${taskId}`, Math.ceil(ttl / 1000));
    }
  }

  // Execute OTP generation strategies for allowed methods
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

      // Generate and send OTP via selected strategy
      const otp = await strategy.generate({
        ...data,
        recipient: options.recipient,
      });

      // Send OTP to recipient via selected strategy
      await strategy.send(options.recipient, otp);

      // Store OTP in Redis with expiration
      await this.redisClient.set(
        `otp:${taskId}:${method}`,
        otp,
        'EX',
        Math.ceil(options.ttl || 30000 / 1000),
      );
    }
  }

  // Add task to appropriate queue based on priority
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

  private async updateTaskStatus(
    taskId: string,
    status: TaskFlowStatus,
    method: string,
  ): Promise<void> {
    const taskKey = `task:${taskId}`;
    const taskData = await this.redisClient.hgetall(taskKey);

    // Early return if task not found
    if (!taskData) {
      this.logger.warn(`Task with ID ${taskId} not found in Redis`);
      return;
    }

    // Determine queue key based on task priority
    const queueKey =
      parseInt(taskData.priority) > 0
        ? `priority_queue:${taskData.queue}`
        : `queue:${taskData.queue}`;

    // Handle successful task verification
    if (status === TaskFlowStatus.SUCCESS) {
      this.logger.log(`Task ${taskId} successfully verified. Cleaning up.`);

      // Parallel cleanup operations
      await Promise.all([
        this.redisClient.del(taskKey),
        this.removeFromQueue(queueKey, taskId),
        this.cleanupOtpKeys(taskId),
      ]);
    } else {
      // Update task status for non-successful scenarios
      await this.redisClient.hmset(taskKey, {
        status,
        verifiedAt: Date.now(),
        verificationMethod: method,
      });
    }
  }

  /**
   * Remove task from queue based on queue type
   * @param queueKey Redis queue key
   * @param taskId Task identifier to remove
   */
  private async removeFromQueue(
    queueKey: string,
    taskId: string,
  ): Promise<void> {
    const queueType = await this.redisClient.type(queueKey);

    const removalMap = {
      zset: () => this.redisClient.zrem(queueKey, taskId),
      list: () => this.redisClient.lrem(queueKey, 0, taskId),
    };

    const removalFn = removalMap[queueType];
    if (removalFn) {
      await removalFn();
    } else {
      this.logger.warn(
        `Queue key ${queueKey} has unexpected type: ${queueType}`,
      );
    }
  }

  /**
   * Clean up OTP-related keys for a task
   * @param taskId Task identifier
   */
  private async cleanupOtpKeys(taskId: string): Promise<void> {
    const otpCleanupKeys = Object.values(TaskFlowMethods).map(
      (method) => `otp:${taskId}:${method}`,
    );

    await Promise.all(otpCleanupKeys.map((key) => this.redisClient.del(key)));
  }

  // Generate unique task identifier
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // When retrieving metadata
  private async getTaskMetadata(taskId: string): Promise<TaskMetadata> {
    const metadata = await this.redisClient.hgetall(`task:${taskId}`);

    // Check if task metadata exists
    if (!metadata || Object.keys(metadata).length === 0) {
      Logger.error(`Task with ID ${taskId} not found`);
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Parse JSON strings back to objects
    return {
      ...metadata,
      data: JSON.parse(metadata.data || '{}'),
      recipient: JSON.parse(metadata.recipient || '{}'),
      priority: Number(metadata.priority),
      timeout: Number(metadata.timeout),
      timestamp: Number(metadata.timestamp),
    } as TaskMetadata;
  }
}
