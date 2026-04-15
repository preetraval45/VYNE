import { NextResponse } from 'next/server'

export const runtime = 'edge'

const SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'VYNE Public API',
    version: '0.9.0',
    description:
      'The unified API for the VYNE company OS. Authenticate with `Authorization: Bearer vyne_live_<key>` from Settings → Developer.',
    contact: { name: 'VYNE platform team', email: 'platform@vyne.dev' },
  },
  servers: [
    { url: 'https://api.vyne.dev/v1', description: 'Production' },
    { url: 'https://api.staging.vyne.dev/v1', description: 'Staging' },
    { url: 'http://localhost:4000/v1', description: 'Local dev' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'vyne_live_<key>',
      },
    },
    schemas: {
      Issue: {
        type: 'object',
        required: ['id', 'title', 'status'],
        properties: {
          id: { type: 'string', example: 'iss_8k4j2n' },
          title: { type: 'string', example: 'Fix Secrets Manager IAM permission' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'in_review', 'done', 'blocked'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          assigneeId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Order: {
        type: 'object',
        required: ['id', 'number', 'status', 'total'],
        properties: {
          id: { type: 'string', example: 'ord_a8k3pq' },
          number: { type: 'string', example: 'ORD-1042' },
          customerId: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
          total: { type: 'number', example: 8400 },
          currency: { type: 'string', example: 'USD' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Webhook: {
        type: 'object',
        required: ['id', 'url', 'events'],
        properties: {
          id: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          events: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'order.created',
                'order.updated',
                'order.shipped',
                'invoice.paid',
                'issue.created',
                'incident.detected',
              ],
            },
          },
          active: { type: 'boolean' },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          code: { type: 'string', nullable: true },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Missing or invalid API key',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      RateLimited: {
        description: 'Tier rate limit exceeded',
        headers: {
          'X-RateLimit-Limit': { schema: { type: 'integer' } },
          'X-RateLimit-Remaining': { schema: { type: 'integer' } },
          'X-RateLimit-Reset': { schema: { type: 'integer' } },
        },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/issues': {
      get: {
        summary: 'List issues',
        operationId: 'listIssues',
        tags: ['Issues'],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by status',
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
        ],
        responses: {
          '200': {
            description: 'A list of issues',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Issue' } },
                    nextCursor: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
      post: {
        summary: 'Create an issue',
        operationId: 'createIssue',
        tags: ['Issues'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  priority: { type: 'string' },
                  assigneeId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created issue',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Issue' },
              },
            },
          },
        },
      },
    },
    '/issues/{id}': {
      get: {
        summary: 'Get an issue',
        operationId: 'getIssue',
        tags: ['Issues'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Issue',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Issue' } },
            },
          },
        },
      },
      patch: {
        summary: 'Update an issue',
        operationId: 'updateIssue',
        tags: ['Issues'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  priority: { type: 'string' },
                  assigneeId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated issue' } },
      },
    },
    '/orders': {
      get: {
        summary: 'List orders',
        operationId: 'listOrders',
        tags: ['Orders'],
        responses: {
          '200': {
            description: 'A list of orders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/orders/{id}/approve': {
      post: {
        summary: 'Approve an order',
        operationId: 'approveOrder',
        tags: ['Orders'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Order approved' } },
      },
    },
    '/webhooks': {
      get: {
        summary: 'List webhook endpoints',
        operationId: 'listWebhooks',
        tags: ['Webhooks'],
        responses: {
          '200': {
            description: 'Configured webhooks',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Webhook' },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Subscribe a new webhook',
        operationId: 'createWebhook',
        tags: ['Webhooks'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Webhook' },
            },
          },
        },
        responses: { '201': { description: 'Webhook created' } },
      },
    },
    '/ai/query': {
      post: {
        summary: 'Run a natural-language query against the AI orchestrator',
        operationId: 'aiQuery',
        tags: ['AI'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['question'],
                properties: {
                  question: { type: 'string', example: 'Which orders are stuck?' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Agent answer with reasoning trace',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    answer: { type: 'string' },
                    reasoningSteps: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Issues', description: 'Issues, sprints, and tasks' },
    { name: 'Orders', description: 'ERP orders + fulfilment' },
    { name: 'Webhooks', description: 'Outbound event subscriptions' },
    { name: 'AI', description: 'AI agents + queries' },
  ],
}

export async function GET() {
  return NextResponse.json(SPEC, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
