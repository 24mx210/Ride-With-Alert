import { z } from 'zod';
import { insertManagerSchema, insertDriverSchema, insertVehicleSchema, insertEmergencySchema, managers, drivers, vehicles, emergencies } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    managerLogin: {
      method: 'POST' as const,
      path: '/api/auth/manager/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof managers.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    driverLogin: {
      method: 'POST' as const,
      path: '/api/auth/driver/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof drivers.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  vehicles: {
    register: {
      method: 'POST' as const,
      path: '/api/vehicle/register',
      input: insertVehicleSchema,
      responses: {
        201: z.custom<typeof vehicles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    assignDriver: {
      method: 'POST' as const,
      path: '/api/vehicle/assign-driver',
      input: z.object({ vehicleId: z.number(), driverId: z.number() }),
      responses: {
        200: z.custom<typeof vehicles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/vehicle/all',
      responses: {
        200: z.array(z.custom<typeof vehicles.$inferSelect & { driver?: typeof drivers.$inferSelect | null }>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vehicle/:id',
      responses: {
        200: z.custom<typeof vehicles.$inferSelect & { driver?: typeof drivers.$inferSelect | null }>(),
        404: errorSchemas.notFound,
      },
    }
  },
  drivers: {
    register: {
      method: 'POST' as const,
      path: '/api/driver/register',
      input: insertDriverSchema,
      responses: {
        201: z.custom<typeof drivers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/driver/all',
      responses: {
        200: z.array(z.custom<typeof drivers.$inferSelect>()),
      },
    },
  },
  emergency: {
    trigger: {
      method: 'POST' as const,
      path: '/api/emergency/trigger',
      // Multipart form data is not strictly validated here by Zod body parser, handled by Multer + manual validation
      input: z.any(), 
      responses: {
        201: z.custom<typeof emergencies.$inferSelect>(),
      },
    },
    acknowledge: {
      method: 'POST' as const,
      path: '/api/emergency/acknowledge',
      input: z.object({ emergencyId: z.number() }),
      responses: {
        200: z.custom<typeof emergencies.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/emergency/all',
      responses: {
        200: z.array(z.custom<typeof emergencies.$inferSelect & { driver: typeof drivers.$inferSelect, vehicle: typeof vehicles.$inferSelect }>()),
      },
    },
  },
};

export const socketEvents = {
  EMERGENCY_TRIGGERED: 'emergency_triggered',
  LOCATION_UPDATE: 'location_update',
  ALARM_STOP: 'alarm_stop',
  ACKNOWLEDGEMENT_SENT: 'acknowledgement_sent',
  RECEIVE_EMERGENCY: 'receive_emergency',
  RECEIVE_LOCATION: 'receive_location',
  STOP_ALARM: 'stop_alarm',
  RECEIVE_ACKNOWLEDGEMENT: 'receive_acknowledgement',
} as const;
