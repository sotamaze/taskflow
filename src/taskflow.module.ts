/* eslint-disable @typescript-eslint/no-unused-vars */
import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { TaskFlowService } from './taskflow.service';
import {
  TaskFlowModuleAsyncOptions,
  TaskFlowModuleOptions,
} from './interfaces';
import { TASKFLOW_OPTIONS } from './constants';
import { CallbackModule } from './callback/callback.module';
import { StrategyRegistry } from './strategies';

@Global()
@Module({})
export class TaskFlowModule {
  /**
   * Create strategy providers from the StrategyRegistry
   * Automatically registers all defined strategies as providers
   *
   * @returns Array of strategy providers
   */
  private static createStrategyProviders(): Provider[] {
    return Array.from(StrategyRegistry['strategies'].entries()).map(
      ([_, StrategyClass]) => ({
        provide: StrategyClass,
        useClass: StrategyClass,
      }),
    );
  }

  /**
   * Synchronously configure the TaskFlow module with static options
   *
   * @param options Configuration options for the module
   * @returns Dynamically configured module
   */
  static forRoot(options: TaskFlowModuleOptions): DynamicModule {
    const strategyProviders = this.createStrategyProviders();

    return {
      module: TaskFlowModule,
      imports: [
        RedisModule.forRoot({
          ...options.redis,
          config: [
            { ...options.redis.config, namespace: 'client' },
            { ...options.redis.config, namespace: 'subscriber' },
          ],
        }),
        CallbackModule,
      ],
      providers: [
        TaskFlowService,
        StrategyRegistry,
        { provide: TASKFLOW_OPTIONS, useValue: options },
        ...strategyProviders,
      ],
      exports: [TaskFlowService, TASKFLOW_OPTIONS],
    };
  }

  /**
   * Asynchronously configure the TaskFlow module with dynamic options
   *
   * @param asyncOptions Asynchronous configuration options
   * @param isGlobal Whether to register the module globally (default: true)
   * @returns Dynamically configured module
   */
  static forRootAsync(
    asyncOptions: TaskFlowModuleAsyncOptions,
    isGlobal = true,
  ): DynamicModule {
    const strategyProviders = this.createStrategyProviders();

    return {
      module: TaskFlowModule,
      imports: [
        RedisModule.forRootAsync({
          useFactory: async (options: TaskFlowModuleOptions) => ({
            ...options.redis,
            config: [
              { ...options.redis.config, namespace: 'client' },
              { ...options.redis.config, namespace: 'subscriber' },
            ],
          }),
          inject: [TASKFLOW_OPTIONS],
        }),
        ...(asyncOptions.imports || []),
        CallbackModule,
      ],
      providers: [
        {
          provide: TASKFLOW_OPTIONS,
          useFactory: asyncOptions.useFactory,
          inject: asyncOptions.inject || [],
        },
        TaskFlowService,
        StrategyRegistry,
        ...strategyProviders,
      ],
      exports: [TaskFlowService, TASKFLOW_OPTIONS],
      global: isGlobal,
    };
  }
}
