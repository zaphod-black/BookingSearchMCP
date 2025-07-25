#!/usr/bin/env node

import dotenv from 'dotenv';
import { BookingSearchMCPServer } from './mcp/server';
import { logger } from './utils/logger';
import { VoicePerformanceMonitor } from './performance/voice-monitor';

// Load environment variables
dotenv.config();

// Global error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

async function main() {
  try {
    logger.info('Starting BookingSearchMCP Server...', {
      version: '1.0.0',
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    });
    
    // Initialize performance monitoring
    const performanceMonitor = new VoicePerformanceMonitor();
    
    // Create and start MCP server
    const server = new BookingSearchMCPServer();
    await server.start();
    
    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        await server.stop();
        logger.info('BookingSearchMCP Server stopped successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    logger.info('BookingSearchMCP Server started successfully', {
      pid: process.pid,
      memoryUsage: process.memoryUsage()
    });
    
  } catch (error) {
    logger.error('Failed to start BookingSearchMCP Server', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  main();
}

export { BookingSearchMCPServer };