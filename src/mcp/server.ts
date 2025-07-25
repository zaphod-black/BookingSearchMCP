import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from '../utils/logger';
import { BookingSearchTools } from './tools';
import { VoiceOptimizedCache } from '../cache/voice-cache';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

export class BookingSearchMCPServer {
  private server: Server;
  private tools: BookingSearchTools;
  private cache: VoiceOptimizedCache;
  
  constructor() {
    this.server = new Server(
      {
        name: 'booking-search-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.cache = new VoiceOptimizedCache();
    this.tools = new BookingSearchTools(this.cache);
    
    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getToolDefinitions(),
      };
    });
    
    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.info('MCP tool called', { tool: name, args });
      const startTime = performance.now();
      
      try {
        let result;
        
        switch (name) {
          case 'search_availability':
            result = await this.tools.searchAvailability(args as any);
            break;
            
          case 'validate_booking_selection':
            result = await this.tools.validateBookingSelection(args as any);
            break;
            
          case 'prepare_payment_handoff':
            result = await this.tools.preparePaymentHandoff(args as any);
            break;
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        const responseTime = performance.now() - startTime;
        logger.info('MCP tool completed', { tool: name, responseTime });
        
        return result;
        
      } catch (error) {
        logger.error('MCP tool error', { tool: name, error });
        throw error;
      }
    });
  }
  
  private getToolDefinitions(): Tool[] {
    return [
      {
        name: 'search_availability',
        description: 'Search for available booking slots based on criteria. Returns voice-optimized results.',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: {
              type: 'string',
              description: 'Start date for availability search (YYYY-MM-DD)',
            },
            endDate: {
              type: 'string',
              description: 'End date for availability search (YYYY-MM-DD)',
            },
            partySize: {
              type: 'number',
              description: 'Number of people in the party',
            },
            activityType: {
              type: 'string',
              description: 'Type of activity to search for',
            },
            platform: {
              type: 'string',
              description: 'Booking platform to search (gcalendar, mock, etc)',
            },
            sessionId: {
              type: 'string',
              description: 'Voice session ID for tracking',
            },
            priceMin: {
              type: 'number',
              description: 'Minimum price per person',
            },
            priceMax: {
              type: 'number',
              description: 'Maximum price per person',
            },
          },
          required: ['startDate', 'endDate', 'partySize'],
        },
      },
      {
        name: 'validate_booking_selection',
        description: 'Validate a selected booking option and reserve it temporarily',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Voice session ID',
            },
            selectedOptionId: {
              type: 'string',
              description: 'ID of the selected availability slot',
            },
            customerInfo: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Customer full name',
                },
                phone: {
                  type: 'string',
                  description: 'Customer phone number',
                },
                email: {
                  type: 'string',
                  description: 'Customer email address',
                },
              },
              required: ['name', 'phone'],
            },
          },
          required: ['sessionId', 'selectedOptionId', 'customerInfo'],
        },
      },
      {
        name: 'prepare_payment_handoff',
        description: 'Prepare booking handoff to CorePaymentMCP for payment processing',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Voice session ID',
            },
            customerContactPreference: {
              type: 'string',
              enum: ['email', 'sms', 'both'],
              description: 'How to send payment link to customer',
            },
          },
          required: ['sessionId', 'customerContactPreference'],
        },
      },
    ];
  }
  
  async start(): Promise<void> {
    logger.info('Starting BookingSearchMCP server...');
    
    // Pre-warm cache if enabled
    if (process.env.CACHE_WARM_UP_ENABLED === 'true') {
      await this.cache.preloadCommonSearches();
    }
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('BookingSearchMCP server started successfully');
  }
  
  async stop(): Promise<void> {
    logger.info('Stopping BookingSearchMCP server...');
    await this.server.close();
  }
}