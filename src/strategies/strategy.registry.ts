import { Injectable, Type } from '@nestjs/common';
import { BaseStrategy } from './base.strategy';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class StrategyRegistry {
  /**
   * Static map to store strategy classes during initialization
   * Preserved across all instances of StrategyRegistry
   */
  private static strategies = new Map<string, Type<BaseStrategy>>();

  /**
   * Instance-specific map to store strategy instances
   */
  private strategies = new Map<string, BaseStrategy>();

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Statically register a strategy class for a specific method
   *
   * @param method Unique identifier for the strategy
   * @param strategyClass Strategy class extending BaseStrategy
   * @throws Error if a strategy for the method is already registered
   */
  static registerStatic(
    method: string,
    strategyClass: Type<BaseStrategy>,
  ): void {
    if (this.strategies.has(method)) {
      throw new Error(`Strategy for method "${method}" is already registered.`);
    }
    this.strategies.set(method, strategyClass);
  }

  /**
   * Retrieve a strategy instance for a specific method
   * Lazily creates and caches the strategy instance if not already exists
   *
   * @param method Unique identifier for the strategy
   * @returns Instantiated strategy for the given method
   * @throws Error if no strategy is registered for the method
   */
  get(method: string): BaseStrategy {
    if (!this.strategies.has(method)) {
      const strategyClass = StrategyRegistry.strategies.get(method);

      if (!strategyClass) {
        throw new Error(`No strategy registered for method: "${method}".`);
      }

      const instance = this.moduleRef.get(strategyClass, { strict: false });
      this.strategies.set(method, instance);
    }

    return this.strategies.get(method);
  }

  /**
   * Retrieve all registered strategy instances
   * Ensures all registered strategy classes are instantiated
   *
   * @returns Map of method names to strategy instances
   */
  getAll(): Map<string, BaseStrategy> {
    StrategyRegistry.strategies.forEach((strategyClass, method) => {
      if (!this.strategies.has(method)) {
        const instance = this.moduleRef.get(strategyClass, { strict: false });
        this.strategies.set(method, instance);
      }
    });

    return this.strategies;
  }
}
