import { db } from "./db";
import {
  managers, drivers, vehicles, emergencies, fuelLogs, serviceLogs,
  type Manager, type Driver, type Vehicle, type Emergency, type FuelLog, type ServiceLog,
  type InsertManager, type InsertDriver, type InsertVehicle, type InsertEmergency, type InsertFuelLog, type InsertServiceLog
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Manager
  getManagerByUsername(username: string): Promise<Manager | undefined>;
  createManager(manager: InsertManager): Promise<Manager>;

  // Driver
  getDriverByUsername(username: string): Promise<Driver | undefined>;
  getDriver(id: number): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  getAllDrivers(): Promise<Driver[]>;

  // Vehicle
  getVehicle(id: number): Promise<Vehicle | undefined>;
  getVehicleByNumber(number: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicleDriver(vehicleId: number, driverId: number): Promise<Vehicle>;
  updateVehicleStatus(id: number, updates: Partial<Vehicle>): Promise<Vehicle>;
  getAllVehicles(): Promise<(Vehicle & { driver: Driver | null })[]>;

  // Emergency
  createEmergency(emergency: InsertEmergency): Promise<Emergency>;
  updateEmergencyStatus(id: number, status: "ACKNOWLEDGED"): Promise<Emergency>;
  getAllEmergencies(): Promise<(Emergency & { driver: Driver; vehicle: Vehicle })[]>;

  // Fuel & Service
  createFuelLog(log: InsertFuelLog): Promise<FuelLog>;
  getFuelLogs(vehicleId: number): Promise<FuelLog[]>;
  createServiceLog(log: InsertServiceLog): Promise<ServiceLog>;
  getServiceLogs(vehicleId: number): Promise<ServiceLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getManagerByUsername(username: string): Promise<Manager | undefined> {
    const [manager] = await db.select().from(managers).where(eq(managers.username, username));
    return manager;
  }

  async createManager(manager: InsertManager): Promise<Manager> {
    const [newManager] = await db.insert(managers).values(manager).returning();
    return newManager;
  }

  async getDriverByUsername(username: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.username, username));
    return driver;
  }

  async getDriver(id: number): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.id, id));
    return driver;
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    const [newDriver] = await db.insert(drivers).values(driver).returning();
    return newDriver;
  }

  async getAllDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers);
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async getVehicleByNumber(number: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.vehicleNumber, number));
    return vehicle;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db.insert(vehicles).values(vehicle).returning();
    return newVehicle;
  }

  async updateVehicleDriver(vehicleId: number, driverId: number): Promise<Vehicle> {
    await db.update(drivers).set({ vehicleId }).where(eq(drivers.id, driverId));
    const [updatedVehicle] = await db.update(vehicles)
      .set({ driverId })
      .where(eq(vehicles.id, vehicleId))
      .returning();
    return updatedVehicle;
  }

  async updateVehicleStatus(id: number, updates: Partial<Vehicle>): Promise<Vehicle> {
    const [updated] = await db.update(vehicles)
      .set(updates)
      .where(eq(vehicles.id, id))
      .returning();
    return updated;
  }

  async getAllVehicles(): Promise<(Vehicle & { driver: Driver | null })[]> {
    const results = await db.query.vehicles.findMany({
      with: { driver: true }
    });
    return results;
  }

  async createEmergency(emergency: InsertEmergency): Promise<Emergency> {
    const [newEmergency] = await db.insert(emergencies).values(emergency).returning();
    return newEmergency;
  }

  async updateEmergencyStatus(id: number, status: "ACKNOWLEDGED"): Promise<Emergency> {
    const [updated] = await db.update(emergencies)
      .set({ status })
      .where(eq(emergencies.id, id))
      .returning();
    return updated;
  }

  async getAllEmergencies(): Promise<(Emergency & { driver: Driver; vehicle: Vehicle })[]> {
    return await db.query.emergencies.findMany({
      with: { driver: true, vehicle: true },
      orderBy: desc(emergencies.createdAt)
    });
  }

  async createFuelLog(log: InsertFuelLog): Promise<FuelLog> {
    const [newLog] = await db.insert(fuelLogs).values(log).returning();
    return newLog;
  }

  async getFuelLogs(vehicleId: number): Promise<FuelLog[]> {
    return await db.select().from(fuelLogs).where(eq(fuelLogs.vehicleId, vehicleId)).orderBy(desc(fuelLogs.date));
  }

  async createServiceLog(log: InsertServiceLog): Promise<ServiceLog> {
    const [newLog] = await db.insert(serviceLogs).values(log).returning();
    return newLog;
  }

  async getServiceLogs(vehicleId: number): Promise<ServiceLog[]> {
    return await db.select().from(serviceLogs).where(eq(serviceLogs.vehicleId, vehicleId)).orderBy(desc(serviceLogs.date));
  }
}

export const storage = new DatabaseStorage();
