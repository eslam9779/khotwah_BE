import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ClassPilot API',
      version: '1.0.0',
      description: `
## ClassPilot REST API

منصة تعليمية للمدرسين والطلاب وأولياء الأمور.

### المصادقة
جميع الـEndpoints المحمية تتطلب إرسال **Bearer Token** في الـHeader:
\`\`\`
Authorization: Bearer <access_token>
\`\`\`

### الأدوار
- **TEACHER**: المدرس — لديه Workspace مستقل
- **STUDENT**: الطالب — يصل لبياناته فقط
- **PARENT**: ولي الأمر — يصل لبيانات أبنائه وفق صلاحيات المدرس
      `,
      contact: {
        name: 'ClassPilot Support',
      },
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Development Server' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Validation failed' },
                details: { type: 'object' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.schema.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
