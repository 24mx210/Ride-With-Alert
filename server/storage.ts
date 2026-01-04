import { db } from "./db";
import {
  managers, drivers, vehicles, emergencies,
  type Manager, type Driver, type Vehicle, type Emergency,
  type InsertManager, type InsertDriver, type InsertVehicle, type InsertEmergency
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
  getAllVehicles(): Promise<(Vehicle & { driver: Driver | null })[]>;

  // Emergency
  createEmergency(emergency: InsertEmergency): Promise<Emergency>;
  updateEmergencyStatus(id: number, status: "ACKNOWLEDGED"): Promise<Emergency>;
  getAllEmergencies(): Promise<(Emergency & { driver: Driver; vehicle: Vehicle })[]>;
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
    // Also update driver's vehicleId for consistency (optional but good for bi-directional lookup)
    await db.update(drivers).set({ vehicleId }).where(eq(drivers.id, driverId));
    
    const [updatedVehicle] = await db.update(vehicles)
      .set({ driverId })
      .where(eq(vehicles.id, vehicleId))
      .returning();
    return updatedVehicle;
  }

  async getAllVehicles(): Promise<(Vehicle & { driver: Driver | null })[]> {
    const results = await db.query.vehicles.findMany({
      with: {
        driver: true
      }
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
      with: {
        driver: true,
        vehicle: true
      },
      orderBy: desc(emergencies.createdAt)
    });
  }
}

export const storage = new DatabaseStorage();
