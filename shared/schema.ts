import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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
  username: text("username").notNull().unique(), // Used for login
  password: text("password").notNull(),
  phone: text("phone").notNull(),
  licenseNumber: text("license_number").notNull(),
  vehicleId: integer("vehicle_id"), // Can be null if not assigned
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  vehicleNumber: text("vehicle_number").notNull().unique(),
  type: text("type").notNull(), // e.g., "Ambulance", "Police", "Truck"
  fuelCapacity: integer("fuel_capacity").notNull(),
  driverId: integer("driver_id"), // Can be null if not assigned
  createdAt: timestamp("created_at").defaultNow(),
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

export const vehiclesRelations = relations(vehicles, ({ one }) => ({
  driver: one(drivers, {
    fields: [vehicles.driverId],
    references: [drivers.id],
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
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true, vehicleId: true }); // vehicleId assigned later
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true, driverId: true });
export const insertEmergencySchema = createInsertSchema(emergencies).omit({ id: true, createdAt: true, status: true });

// === TYPES ===

export type Manager = typeof managers.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Vehicle = typeof vehicles.$inferSelect;
export type Emergency = typeof emergencies.$inferSelect;

export type InsertManager = z.infer<typeof insertManagerSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type InsertEmergency = z.infer<typeof insertEmergencySchema>;

// Auth Types
export type LoginRequest = { username: string; password: string };
