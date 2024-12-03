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
      strategies: {
        [TaskFlowMethods.EMAIL]: new EmailStrategy(), // Strategy for handling Email OTP logic
        [TaskFlowMethods.SMS]: new SmsStrategy(), // Strategy for handling SMS OTP logic
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
```

### 3. Verifying a Task

Verify a task by validating its OTP.

```typescript
const otp = "123456"
const isVerified = await taskFlowService.verify(
  task.id, // Task ID
  TaskFlowMethods.EMAIL, // Method verfify
  otp, // OTP
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
  @OnTaskVerified('QUEUE_NAME', {
    maxAttempts: 3, // Number of retry attempts for task failures
    backoffStrategy: 'exponential', // Backoff strategy for retries
    backoffTime: 5000, // Base time in milliseconds between retries
  })
  async handleVerifiedTask(metadata: TaskMetadata<JobData>) {
    console.log(
      `Task ${eventData.taskId} verified in queue ${eventData.queue}`,
    );
    // Add your business logic here, such as updating a database or notifying users
  }
}
```

### 5. Resending OTP

You can resend OTP for a specific task and method using the resendOtp method. This is useful if a user requests a new OTP after the initial one has expired or was not received.

Example: Resending OTP for a Task
```typescript
const taskId = "task_123456"
await taskFlowService.resendOtp(
  taskId, // The unique identifier of the task
  TaskFlowMethods.EMAIL,   // The verification method (e.g., 'EMAIL', 'SMS')
);
console.log('OTP resent successfully.');
```

### 6. Updating Recipient Details

You can update the recipient details for a specific task and resend OTP automatically. This is helpful if the user wants to change their email, phone number, or device during the verification process.

Example: Updating Recipient Information
```typescript
await taskFlowService.updateRecipient(
  'task_id', // The unique identifier of the task
  {
    email: 'newemail@example.com',        // Update the email address (optional)
    phoneNumber: '+1234567890',          // Update the phone number (optional)
    deviceId: 'new-device-id-123456',    // Update the device ID (optional)
  },
);
console.log('Recipient updated and OTP resent successfully.');
```

### 7. Custom Strategies

Strategies allow you to define custom OTP generation and notification logic. Extend `BaseStrategy` to create your own strategy.

#### Example: Email OTP Strategy

```typescript
import { BaseStrategy } from '@sotatech/nest-taskflow';

export class EmailStrategy extends BaseStrategy {
  /**
   * Generate an OTP for Email verification.
   * Override this method to provide custom OTP generation logic.
   * @param metadata Task-specific data
   * @returns Generated OTP
   */
  async generate(metadata: TaskMetadata<JobData>): Promise<string> {
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
    redis: { config: { host: 'localhost', port: 6379 } },
    strategies: {
      [TaskFlowMethods.EMAIL]: new EmailStrategy(), // Handle Email OTP
      [TaskFlowMethods.SMS]: new SmsStrategy(), // Handle SMS OTP
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
