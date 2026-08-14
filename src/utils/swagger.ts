import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VaultGuard Zero-Knowledge Password Manager API',
      version: '1.0.0',
      description: 'Enterprise API for zero-knowledge vault management, Argon2id authentication, and SSO integration.',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'V1 API Server',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
