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
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  phone: text("phone").notNull(),
  licenseNumber: text("license_number").notNull(),
  vehicleId: integer("vehicle_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  type: text("type").notNull(),
  fuelCapacity: integer("fuel_capacity").notNull(),
  currentFuel: integer("current_fuel").default(100), // percentage 0-100
  lastServiceDate: timestamp("last_service_date"),
  nextServiceMileage: integer("next_service_mileage"),
  currentMileage: integer("current_mileage").default(0),
  driverId: integer("driver_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fuelLogs = pgTable("fuel_logs", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  amount: numeric("amount").notNull(),
  cost: numeric("cost").notNull(),
  mileage: integer("mileage").notNull(),
  date: timestamp("date").defaultNow(),
});

export const serviceLogs = pgTable("service_logs", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  description: text("description").notNull(),
  cost: numeric("cost").notNull(),
  mileage: integer("mileage").notNull(),
  date: timestamp("date").defaultNow(),
});

export const emergencies = pgTable("emergencies", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(),
  vehicleId: integer("vehicle_id").notNull(),
  location: jsonb("location").$type<{ latitude: number; longitude: number }>().notNull(),
  videoUrl: text("video_url"),
  status: text("status", { enum: ["ACTIVE", "ACKNOWLEDGED"] }).default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const driversRelations = relations(drivers, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [drivers.vehicleId],
    references: [vehicles.id],
  }),
  emergencies: many(emergencies),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  driver: one(drivers, {
    fields: [vehicles.driverId],
    references: [drivers.id],
  }),
  fuelLogs: many(fuelLogs),
  serviceLogs: many(serviceLogs),
}));

export const fuelLogsRelations = relations(fuelLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [fuelLogs.vehicleId],
    references: [vehicles.id],
  }),
}));

export const serviceLogsRelations = relations(serviceLogs, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [serviceLogs.vehicleId],
    references: [vehicles.id],
  }),
}));

export const emergenciesRelations = relations(emergencies, ({ one }) => ({
  driver: one(drivers, {
    fields: [emergencies.driverId],
    references: [drivers.id],
  }),
  vehicle: one(vehicles, {
    fields: [emergencies.vehicleId],
    references: [vehicles.id],
  }),
}));

// === SCHEMAS ===

export const insertManagerSchema = createInsertSchema(managers).omit({ id: true, createdAt: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true, vehicleId: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true, driverId: true });
export const insertEmergencySchema = createInsertSchema(emergencies).omit({ id: true, createdAt: true, status: true });
export const insertFuelLogSchema = createInsertSchema(fuelLogs).omit({ id: true, date: true });
export const insertServiceLogSchema = createInsertSchema(serviceLogs).omit({ id: true, date: true });

// === TYPES ===

export type Manager = typeof managers.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Emergency = typeof emergencies.$inferSelect;
export type FuelLog = typeof fuelLogs.$inferSelect;
export type ServiceLog = typeof serviceLogs.$inferSelect;

export type InsertManager = z.infer<typeof insertManagerSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertEmergency = z.infer<typeof insertEmergencySchema>;
export type InsertFuelLog = z.infer<typeof insertFuelLogSchema>;
export type InsertServiceLog = z.infer<typeof insertServiceLogSchema>;

// Auth Types
export type LoginRequest = { username: string; password: string };
