/** Hand-written OpenAPI 3.0 spec for the checkout-service API, served at GET /docs. */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'checkout-service',
    version: '1.0.0',
    description: 'Checkout/orders service — Lab B (Dev + QA tracks). Money is integer cents.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } },
              },
            },
          },
        },
      },
    },
    '/products': {
      get: {
        summary: 'List all products',
        responses: {
          '200': {
            description: 'Product list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { products: { type: 'array', items: { $ref: '#/components/schemas/Product' } } },
                },
              },
            },
          },
        },
      },
    },
    '/orders/checkout': {
      post: {
        summary: 'Check out a cart',
        description:
          'Prices the cart (with an optional coupon), reserves stock per line, and creates an order. ' +
          'Pass an Idempotency-Key header to make retries safe: the same key returns the original order ' +
          'without reserving stock again.',
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Client-generated key; retries with the same key return the original order.',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lines'],
                properties: {
                  lines: { type: 'array', items: { $ref: '#/components/schemas/CartLine' } },
                  couponCode: { type: 'string', nullable: true, example: 'SAVE10' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created (or the original order, if the Idempotency-Key was already used)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } },
          },
          '400': {
            description: 'Invalid request, unknown SKU, or insufficient stock',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { error: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Product: {
        type: 'object',
        properties: {
          sku: { type: 'string', example: 'BOOK' },
          name: { type: 'string', example: 'Paperback' },
          priceCents: { type: 'integer', example: 1500 },
          stock: { type: 'integer', example: 25 },
        },
      },
      CartLine: {
        type: 'object',
        required: ['sku', 'quantity'],
        properties: {
          sku: { type: 'string', example: 'BOOK' },
          quantity: { type: 'integer', minimum: 1, example: 2 },
        },
      },
      PriceBreakdown: {
        type: 'object',
        properties: {
          subtotalCents: { type: 'integer' },
          discountCents: { type: 'integer' },
          taxCents: { type: 'integer' },
          totalCents: { type: 'integer' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          lines: { type: 'array', items: { $ref: '#/components/schemas/CartLine' } },
          breakdown: { $ref: '#/components/schemas/PriceBreakdown' },
          couponCode: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
} as const;
