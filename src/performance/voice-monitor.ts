import { logger } from '../utils/logger';

interface PerformanceMetrics {
  averageResponseTime: number;
  slowRequests: number;
  totalRequests: number;
  toolMetrics: Map<string, {
    calls: number;
    totalTime: number;
    averageTime: number;
    slowCalls: number;
  }>;
}

export class VoicePerformanceMonitor {
  private metrics: PerformanceMetrics = {
    averageResponseTime: 0,
    slowRequests: 0,
    totalRequests: 0,
    toolMetrics: new Map()
  };
  
  private readonly slowThreshold: number;
  private readonly reportInterval: number = 60000; // 1 minute
  
  constructor() {
    this.slowThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '100');
    
    if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
      this.startPeriodicReporting();
    }
  }
  
  async monitorToolCall<T>(toolName: string, operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const responseTime = performance.now() - startTime;
      
      this.recordMetrics(toolName, responseTime, true);
      
      if (responseTime > this.slowThreshold) {
        logger.warn('Slow voice response detected', {
          tool: toolName,
          responseTime: Math.round(responseTime),
          threshold: this.slowThreshold
        });
      }
      
      return result;
      
    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.recordMetrics(toolName, responseTime, false);
      
      logger.error('Voice tool execution failed', { 
        tool: toolName, 
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(responseTime)
      });
      
      throw error;
    }
  }
  
  private recordMetrics(toolName: string, responseTime: number, success: boolean): void {
    // Update global metrics
    this.metrics.totalRequests++;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
    
    if (responseTime > this.slowThreshold) {
      this.metrics.slowRequests++;
    }
    
    // Update tool-specific metrics
    let toolMetric = this.metrics.toolMetrics.get(toolName);
    if (!toolMetric) {
      toolMetric = {
        calls: 0,
        totalTime: 0,
        averageTime: 0,
        slowCalls: 0
      };
      this.metrics.toolMetrics.set(toolName, toolMetric);
    }
    
    toolMetric.calls++;
    toolMetric.totalTime += responseTime;
    toolMetric.averageTime = toolMetric.totalTime / toolMetric.calls;
    
    if (responseTime > this.slowThreshold) {
      toolMetric.slowCalls++;
    }
  }
  
  getMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      toolMetrics: new Map(this.metrics.toolMetrics)
    };
  }
  
  getPerformanceReport(): string {
    const totalRequests = this.metrics.totalRequests;
    if (totalRequests === 0) {
      return 'No performance data available';
    }
    
    const avgResponse = Math.round(this.metrics.averageResponseTime);
    const slowPercent = Math.round((this.metrics.slowRequests / totalRequests) * 100);
    
    let report = `Performance Report:\n`;
    report += `Total Requests: ${totalRequests}\n`;
    report += `Average Response Time: ${avgResponse}ms\n`;
    report += `Slow Requests (>${this.slowThreshold}ms): ${this.metrics.slowRequests} (${slowPercent}%)\n`;
    report += `\nTool Performance:\n`;
    
    for (const [toolName, metrics] of this.metrics.toolMetrics.entries()) {
      const avgTime = Math.round(metrics.averageTime);
      const slowPercent = Math.round((metrics.slowCalls / metrics.calls) * 100);
      
      report += `  ${toolName}: ${metrics.calls} calls, ${avgTime}ms avg, ${metrics.slowCalls} slow (${slowPercent}%)\n`;
    }
    
    return report;
  }
  
  private startPeriodicReporting(): void {
    setInterval(() => {
      if (this.metrics.totalRequests > 0) {
        logger.info('Voice Performance Metrics', {
          totalRequests: this.metrics.totalRequests,
          averageResponseTime: Math.round(this.metrics.averageResponseTime),
          slowRequests: this.metrics.slowRequests,
          slowRequestPercentage: Math.round((this.metrics.slowRequests / this.metrics.totalRequests) * 100)
        });
      }
    }, this.reportInterval);
  }
  
  resetMetrics(): void {
    this.metrics = {
      averageResponseTime: 0,
      slowRequests: 0,
      totalRequests: 0,
      toolMetrics: new Map()
    };
    
    logger.info('Performance metrics reset');
  }
}