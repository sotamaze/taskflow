import { Injectable, Type } from '@nestjs/common';
import { TaskFlowMethods } from 'src/enums';
import { StrategyRegistry } from 'src/strategies';

/**
 * Decorator to register a strategy for a specific task flow method
 *
 * @param method The specific task flow method the strategy serves
 * @returns A class decorator that registers the strategy and makes the class injectable
 */
export function RegisterStrategy(method: TaskFlowMethods) {
  return (target: Type<any>) => {
    // Automatically register the strategy with the StrategyRegistry
    StrategyRegistry.registerStatic(method, target);

    // Ensure the class is injectable by NestJS dependency injection
    Injectable()(target);

    return target;
  };
}
