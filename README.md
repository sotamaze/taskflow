# @sotatech/nest-taskflow

`@sotatech/nest-taskflow` is a task flow management library for NestJS that provides a simple yet powerful framework for managing tasks, handling OTP verification, and executing callbacks with retry logic. Built on Redis, it supports robust task flows with Pub/Sub integration.

---

## Features

- **Task Management**:

  - Add tasks with custom metadata, TTL (time-to-live), and priority.
  - Redis-based storage and management.
  - Resend OTP for tasks.
  - Update recipient details dynamically.

- **Task Verification**:

  - Built-in support for OTP (One-Time Password) verification for methods like SMS, Email, and Smart OTP.
  - Strategy-based architecture for extending verification logic.

- **Callback Execution**:

  - Automatically trigger callbacks after task verification.

- **Redis Pub/Sub Integration**:

  - Notify services about task verification events using Redis Pub/Sub.
  - Decorators (`@OnTaskVerified`) to dynamically bind event listeners.

- **Error Handling & Logging**:

  - Detailed error handling for failed tasks and callbacks.
  - Configurable maximum retry attempts and delay strategies.

- **Seamless NestJS Integration**:

  - Built specifically for NestJS with native module integration.
  - Supports dynamic configuration using `forRoot` and `forRootAsync`.
  - Auto-register strategies dynamically without manual instantiation.

## Installation

To install the package, use the following command:

```bash
npm install @sotatech/nest-taskflow
```

---

## Getting Started

### 1. Import and Configure the Module

You can configure `TaskFlowModule` using either `forRoot` or `forRootAsync`.

```typescript
import { Module } from '@nestjs/common';
import { TaskFlowModule } from '@sotatech/nest-taskflow';

@Module({
  imports: [
    TaskFlowModule.forRoot({
      redis: { config: { host: 'localhost', port: 6379 } },
      jobTimeout: 60000,
    }),
  ],
})
export class AppModule {}
```

---

### 2. Adding a Task

Use `TaskFlowService` to add a task to a Redis queue.

```typescript
import {
  InjectTaskFlow,
  TaskFlowMethods,
  TaskFlowService,
} from '@sotatech/nest-taskflow';

@Injectable()
export class ExampleService {
  constructor(
    @InjectTaskFlow()
    private readonly taskFlow: TaskFlowService,
  ) {}

  async addTask() {
    const task = await taskFlow.addTask(
      'QUEUE_NAME', // The queue where the task will be added
      { userId: '12345', email: 'user@example.com' }, // Task data
      {
        allowedMethods: [TaskFlowMethods.EMAIL, TaskFlowMethods.SMS], // Methods allowed for OTP verification
        recipient: { email: 'user@example.com' }, // Recipient details
        priority: 5, // Higher priority tasks are executed first
        ttl: 60000, // Task expires in 60 seconds
      },
    );
    console.log('Task created:', task);
  }
}
```

---

### 3. Verifying a Task

Verify a task by validating its OTP.

```typescript
import {
  InjectTaskFlow,
  TaskFlowMethods,
  TaskFlowService,
} from '@sotatech/nest-taskflow';

@Injectable()
export class ExampleService {
  constructor(
    @InjectTaskFlow()
    private readonly taskFlow: TaskFlowService,
  ) {}

  async addTask() {
    const task = await taskFlow.addTask(
      'QUEUE_NAME', // The queue where the task will be added
      { userId: '12345', email: 'user@example.com' }, // Task data
      {
        allowedMethods: [TaskFlowMethods.EMAIL, TaskFlowMethods.SMS], // Methods allowed for OTP verification
        recipient: { email: 'user@example.com' }, // Recipient details
        priority: 5, // Higher priority tasks are executed first
        ttl: 60000, // Task expires in 60 seconds
      },
    );
    console.log('Task created:', task);
  }

  async verify() {
    const otp = '123456';
    const isVerified = await taskFlow.verify(
      task.id, // Task ID
      TaskFlowMethods.EMAIL, // Verification method
      otp, // OTP
    );
    if (isVerified) {
      console.log('Task verified successfully.');
    }
  }
}
```

---

### 4. Handling Verified Tasks

Use `@OnTaskVerified` to handle events when a task is verified.

```typescript
import { Injectable } from '@nestjs/common';
import { OnTaskVerified } from '@sotatech/nest-taskflow';

@Injectable()
export class ExampleService {
  @OnTaskVerified('QUEUE_NAME', {
    maxAttempts: 3, // Number of retry attempts for task failures
    backoffStrategy: 'exponential', // Backoff strategy for retries
    backoffTime: 5000, // Base time in milliseconds between retries
  })
  async handleVerifiedTask(metadata: TaskMetadata<JobData>) {
    console.log(`Task ${metadata.id} verified in queue ${metadata.queue}`);
    // Add your business logic here
  }
}
```

---

### 5. Resending OTP

Resend OTP for a specific task and method using the `resendOtp` method.

```typescript
await taskFlow.resendOtp(
  'task_id', // The unique identifier of the task
  TaskFlowMethods.EMAIL, // The verification method (e.g., 'EMAIL', 'SMS')
);
console.log('OTP resent successfully.');
```

---

### 6. Updating Recipient Details

Update the recipient details for a specific task and resend OTP automatically.

```typescript
await taskFlow.updateRecipient(
  'task_id', // The unique identifier of the task
  {
    email: 'newemail@example.com', // Update the email address (optional)
    phoneNumber: '+1234567890', // Update the phone number (optional)
    deviceId: 'new-device-id-123456', // Update the device ID (optional)
  },
);
console.log('Recipient updated and OTP resent successfully.');
```

---

### 7. Custom Strategies

Define custom OTP generation and notification logic by extending `BaseStrategy`.

```typescript
import { BaseStrategy } from '@sotatech/nest-taskflow';

@RegisterStrategy(TaskFlowMethods.EMAIL)
export class CustomEmailStrategy extends BaseStrategy {
  /**
   * Generate OTP logic.
   * Override this method to customize generate logic.
   * @param metadata Metadata details (e.g., email address)
   */
  async generate(metadata: TaskMetadata<JobData>): Promise<string> {
    // Default implementation generates a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send the OTP to the user via email.
   * Override this method to customize email sending logic.
   * @param metadata Metadata details (e.g., email address)
   * @param otp The generated OTP
   */
  async send(metadata: TaskMetadata<JobData>, otp: string): Promise<void> {
    console.log(`Sending OTP ${otp} to ${metadata.recipient.email}`);
  }
}
```

---

## Advanced Configuration

### Dynamic Module Configuration

Use `forRootAsync` for asynchronous configuration.

```typescript
TaskFlowModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    redis: {
      config: {
        host: configService.get<string>('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
      },
    },
    jobTimeout: 60000,
  }),
  inject: [ConfigService],
});
```

---

## Future Enhancements

- **Task Monitoring**:

  - Dashboard for tracking task statuses and metrics.

- **Advanced Scheduling**:

  - Support for cron-like scheduled tasks.

- **Multi-Queue Management**:
  - Manage and coordinate multiple task queues efficiently.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.

---

## Support

For issues or questions, please visit our [GitHub Issues](https://github.com/sotatech/nest-taskflow/issues).

---
