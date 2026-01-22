import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const managers = pgTable("managers", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  driverNumber: text("driver_number").notNull().unique(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  licenseNumber: text("license_number").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  vehicleType: text("vehicle_type").notNull(),
  fuelCapacity: integer("fuel_capacity").notNull(),
  currentFuel: integer("current_fuel").default(100), // percentage 0-100
  lastServiceDate: timestamp("last_service_date"),
  nextServiceMileage: integer("next_service_mileage"),
  currentMileage: integer("current_mileage").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fuelLogs = pgTable("fuel_logs", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull(),
  amount: numeric("amount").notNull(),
  cost: numeric("cost").notNull(),
  mileage: integer("mileage").notNull(),
  date: timestamp("date").defaultNow(),
});

export const serviceLogs = pgTable("service_logs", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull(),
  description: text("description").notNull(),
  cost: numeric("cost").notNull(),
  mileage: integer("mileage").notNull(),
  date: timestamp("date").defaultNow(),
});

export const trips = pgTable("trips", {
  tripId: serial("trip_id").primaryKey(),
  driverNumber: text("driver_number").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  temporaryUsername: text("temporary_username").notNull().unique(),
  temporaryPassword: text("temporary_password").notNull(),
  status: text("status", { enum: ["ACTIVE", "COMPLETED"] }).default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const emergencies = pgTable("emergencies", {
  emergencyId: serial("emergency_id").primaryKey(),
  driverNumber: text("driver_number").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  videoUrl: text("video_url"),
  status: text("status", { enum: ["ACTIVE", "ACKNOWLEDGED"] }).default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const driversRelations = relations(drivers, ({ many }) => ({
  trips: many(trips),
  emergencies: many(emergencies),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  trips: many(trips),
  fuelLogs: many(fuelLogs),
  serviceLogs: many(serviceLogs),
}));

export const tripsRelations = relations(trips, ({ one }) => ({
  driver: one(drivers, {
    fields: [trips.driverNumber],
    references: [drivers.driverNumber],
  }),
  vehicle: one(vehicles, {
    fields: [trips.vehicleNumber],
    references: [vehicles.vehicleNumber],
  }),
}));

export const fuelLogsRelations = relations(fuelLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [fuelLogs.vehicleNumber],
    references: [vehicles.vehicleNumber],
  }),
}));

export const serviceLogsRelations = relations(serviceLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [serviceLogs.vehicleNumber],
    references: [vehicles.vehicleNumber],
  }),
}));

export const emergenciesRelations = relations(emergencies, ({ one }) => ({
  driver: one(drivers, {
    fields: [emergencies.driverNumber],
    references: [drivers.driverNumber],
  }),
  vehicle: one(vehicles, {
    fields: [emergencies.vehicleNumber],
    references: [vehicles.vehicleNumber],
  }),
}));

// === SCHEMAS ===

export const insertManagerSchema = createInsertSchema(managers).omit({ id: true, createdAt: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertTripSchema = createInsertSchema(trips).omit({ tripId: true, createdAt: true, completedAt: true });
export const insertEmergencySchema = createInsertSchema(emergencies).omit({ emergencyId: true, createdAt: true, timestamp: true, status: true });
export const insertFuelLogSchema = createInsertSchema(fuelLogs).omit({ id: true, date: true });
export const insertServiceLogSchema = createInsertSchema(serviceLogs).omit({ id: true, date: true });

// === TYPES ===

export type Manager = typeof managers.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type Emergency = typeof emergencies.$inferSelect;
export type FuelLog = typeof fuelLogs.$inferSelect;
export type ServiceLog = typeof serviceLogs.$inferSelect;

export type InsertManager = z.infer<typeof insertManagerSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type InsertEmergency = z.infer<typeof insertEmergencySchema>;
export type InsertFuelLog = z.infer<typeof insertFuelLogSchema>;
export type InsertServiceLog = z.infer<typeof insertServiceLogSchema>;

// Auth Types
export type LoginRequest = { username: string; password: string };
export type DriverLoginRequest = { temporaryUsername: string; temporaryPassword: string };