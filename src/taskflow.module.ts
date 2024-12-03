import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { TaskFlowService } from './taskflow.service';
import {
  TaskFlowModuleAsyncOptions,
  TaskFlowModuleOptions,
} from './interfaces';
import { TASKFLOW_OPTIONS, TASKFLOW_STRATEGIES } from './constants';
import { CallbackModule } from './callback/callback.module';
import { TaskEventListenerService } from './callback/task-event-listener.service';

@Global()
@Module({})
export class TaskFlowModule {
  /**
   * Synchronous configuration method for the module
   * Allows direct configuration of TaskFlow options and strategies
   *
   * @param options TaskFlow module configuration
   * @returns Configured DynamicModule
   */
  static forRoot(options: TaskFlowModuleOptions): DynamicModule {
    // Create providers list with TaskFlowService, options, and strategies
    const strategiesProvider: Provider = {
      provide: TASKFLOW_STRATEGIES,
      useValue: options.strategies,
    };

    const providers: Provider[] = [
      TaskFlowService,
      TaskEventListenerService,
      strategiesProvider,
      {
        provide: TASKFLOW_OPTIONS,
        useValue: options,
      },
    ];

    return {
      module: TaskFlowModule,
      imports: [RedisModule.forRoot(options.redis), CallbackModule],
      providers: providers,
      exports: [TaskFlowService, TASKFLOW_OPTIONS, TASKFLOW_STRATEGIES],
    };
  }

  /**
   * Asynchronous configuration method for the module
   * Supports dependency injection and dynamic options creation
   *
   * @param asyncOptions Asynchronous configuration
   * @param isGlobal Whether to register the module globally
   * @returns Configured DynamicModule
   */
  static forRootAsync(
    asyncOptions: TaskFlowModuleAsyncOptions,
    isGlobal = true,
  ): DynamicModule {
    const providers: Provider[] = [
      {
        provide: TASKFLOW_OPTIONS,
        useFactory: asyncOptions.useFactory,
        inject: asyncOptions.inject || [],
      },
      {
        provide: TASKFLOW_STRATEGIES,
        useFactory: async (options: TaskFlowModuleOptions) =>
          options.strategies || {},
        inject: [TASKFLOW_OPTIONS],
      },
      TaskFlowService,
      TaskEventListenerService,
    ];

    return {
      module: TaskFlowModule,
      imports: [
        RedisModule.forRootAsync({
          useFactory: async (options: TaskFlowModuleOptions) => options.redis,
          inject: [TASKFLOW_OPTIONS],
        }),
        CallbackModule,
      ],
      providers: providers,
      exports: [TaskFlowService, TASKFLOW_OPTIONS, TASKFLOW_STRATEGIES],
      global: isGlobal,
    };
  }
}
