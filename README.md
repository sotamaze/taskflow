# @sotatech/nest-taskflow

`@sotatech/nest-taskflow` is a task flow management library for NestJS that provides a simple yet powerful framework for managing tasks, handling OTP verification, and executing callbacks with retry logic. Built on Redis, it supports robust task flows with Pub/Sub integration.

---

## Features

- **Task Management**:

  - Add tasks with custom metadata, TTL (time-to-live), and priority.
  - Redis-based storage and management.

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

---

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
      redis: { host: 'localhost', port: 6379 },
      strategies: {
        EMAIL: new EmailStrategy(), // Strategy for handling Email OTP logic
        SMS: new SmsStrategy(), // Strategy for handling SMS OTP logic
      },
      retry: {
        maxAttempts: 5, // Number of retry attempts for task failures
        backoffStrategy: 'exponential', // Backoff strategy for retries
        backoffTime: 1000, // Base time in milliseconds between retries
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Adding a Task

Use `TaskFlowService` to add a task to a Redis queue.

```typescript
const task = await taskFlowService.addTask(
  'verificationQueue', // The queue where the task will be added
  { userId: '12345', email: 'user@example.com' }, // Task data
  {
    allowedMethods: ['EMAIL', 'SMS'], // Methods allowed for OTP verification
    recipient: { email: 'user@example.com' }, // Recipient details
    priority: 5, // Higher priority tasks are executed first
    ttl: 60000, // Task expires in 60 seconds
  },
);
console.log('Task created:', task);
```

### 3. Verifying a Task

Verify a task by validating its OTP.

```typescript
const isVerified = await taskFlowService.verifySession(
  'task_123456', // The task ID to verify
  'EMAIL', // The method used for OTP verification
  '123456', // The OTP provided by the user
);

if (isVerified) {
  console.log('Task verified successfully.');
}
```

### 4. Handling Verified Tasks

Use `@OnTaskVerified` to handle events when a task is verified.

```typescript
import { Injectable } from '@nestjs/common';
import { OnTaskVerified } from '@sotatech/nest-taskflow';

@Injectable()
export class ExampleService {
  @OnTaskVerified('verificationQueue')
  async handleVerifiedTask(eventData: { taskId: string; queue: string }) {
    console.log(
      `Task ${eventData.taskId} verified in queue ${eventData.queue}`,
    );
    // Add your business logic here, such as updating a database or notifying users
  }
}
```

### 5. Custom Strategies

Strategies allow you to define custom OTP generation and notification logic. Extend `BaseStrategy` to create your own strategy.

#### Example: Email OTP Strategy

```typescript
import { BaseStrategy } from '@sotatech/nest-taskflow';

export class EmailStrategy extends BaseStrategy {
  /**
   * Generate an OTP for Email verification.
   * Override this method to provide custom OTP generation logic.
   * @param taskData Task-specific data
   * @returns Generated OTP
   */
  async generate(taskData: Record<string, any>): Promise<string> {
    // Default implementation generates a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send the OTP to the user via email.
   * Override this method to customize email sending logic.
   * @param recipient Recipient details (e.g., email address)
   * @param otp The generated OTP
   */
  async send(recipient: { email?: string }, otp: string): Promise<void> {
    if (!recipient.email) {
      throw new Error('Email is required for email notifications');
    }
    console.log(`Sending OTP ${otp} to email: ${recipient.email}`);
    // Add your email-sending logic here
  }
}
```

---

## Advanced Configuration

### Dynamic Module Configuration

Use `forRootAsync` for asynchronous configuration.

```typescript
TaskFlowModule.forRootAsync({
  useFactory: async () => ({
    redis: { host: 'localhost', port: 6379 },
    strategies: {
      EMAIL: new EmailStrategy(), // Handle Email OTP
      SMS: new SmsStrategy(), // Handle SMS OTP
    },
    retry: {
      maxAttempts: 3, // Retry 3 times before failing
      backoffStrategy: 'linear', // Retry intervals increase linearly
      backoffTime: 500, // Start with 500ms delay
    },
  }),
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

For issues or questions, please visit our [GitHub Issues](https://github.com/sotamaze/taskflow/issues).

---
