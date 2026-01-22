import { db } from "./db";
import {
  managers, drivers, vehicles, trips, emergencies, fuelLogs, serviceLogs,
  type Manager, type Driver, type Vehicle, type Trip, type Emergency, type FuelLog, type ServiceLog,
  type InsertManager, type InsertDriver, type InsertVehicle, type InsertTrip, type InsertEmergency, type InsertFuelLog, type InsertServiceLog
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Manager
  getManagerByUsername(username: string): Promise<Manager | undefined>;
  createManager(manager: InsertManager): Promise<Manager>;

  // Driver
  getDriverByDriverNumber(driverNumber: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  getAllDrivers(): Promise<Driver[]>;

  // Vehicle
  getVehicleByVehicleNumber(vehicleNumber: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicleStatus(vehicleNumber: string, updates: Partial<Vehicle>): Promise<Vehicle>;
  updateVehicle(vehicleNumber: string, updates: Partial<Vehicle>): Promise<Vehicle>;
  getAllVehicles(): Promise<Vehicle[]>;

  // Driver
  updateDriver(driverNumber: string, updates: Partial<Driver>): Promise<Driver>;

  // Trip
  createTrip(trip: InsertTrip): Promise<Trip>;
  getTripByCredentials(temporaryUsername: string, temporaryPassword: string): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined>;
  getActiveTripByDriverNumber(driverNumber: string): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined>;
  getActiveTripByVehicleNumber(vehicleNumber: string): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined>;
  getTripById(tripId: number): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined>;
  completeTrip(tripId: number): Promise<Trip>;
  cancelTrip(tripId: number): Promise<Trip>;
  getAllTrips(): Promise<(Trip & { driver: Driver; vehicle: Vehicle })[]>;

  // Emergency
  createEmergency(emergency: InsertEmergency): Promise<Emergency>;
  updateEmergencyStatus(emergencyId: number, status: "ACKNOWLEDGED"): Promise<Emergency>;
  updateAllActiveEmergenciesForDriverVehicle(driverNumber: string, vehicleNumber: string, status: "ACKNOWLEDGED"): Promise<Emergency[]>;
  getActiveEmergencyForDriverVehicle(driverNumber: string, vehicleNumber: string): Promise<Emergency | undefined>;
  getAllEmergencies(): Promise<(Emergency & { driver: Driver; vehicle: Vehicle })[]>;
  getEmergencyWithRelations(emergencyId: number): Promise<(Emergency & { driver: Driver; vehicle: Vehicle }) | undefined>;

  // Fuel & Service
  createFuelLog(log: InsertFuelLog): Promise<FuelLog>;
  getFuelLogs(vehicleNumber: string): Promise<FuelLog[]>;
  createServiceLog(log: InsertServiceLog): Promise<ServiceLog>;
  getServiceLogs(vehicleNumber: string): Promise<ServiceLog[]>;
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

  async getDriverByDriverNumber(driverNumber: string): Promise<Driver | undefined> {
    const [driver] = await db.select().from(drivers).where(eq(drivers.driverNumber, driverNumber));
    return driver;
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    const [newDriver] = await db.insert(drivers).values(driver).returning();
    return newDriver;
  }

  async getAllDrivers(): Promise<Driver[]> {
    return await db.select().from(drivers);
  }

  async getVehicleByVehicleNumber(vehicleNumber: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.vehicleNumber, vehicleNumber));
    return vehicle;
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db.insert(vehicles).values(vehicle).returning();
    return newVehicle;
  }

  async updateVehicleStatus(vehicleNumber: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const [updated] = await db.update(vehicles)
      .set(updates)
      .where(eq(vehicles.vehicleNumber, vehicleNumber))
      .returning();
    return updated;
  }

  async updateVehicle(vehicleNumber: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const [updated] = await db.update(vehicles)
      .set(updates)
      .where(eq(vehicles.vehicleNumber, vehicleNumber))
      .returning();
    return updated;
  }

  async updateDriver(driverNumber: string, updates: Partial<Driver>): Promise<Driver> {
    const [updated] = await db.update(drivers)
      .set(updates)
      .where(eq(drivers.driverNumber, driverNumber))
      .returning();
    return updated;
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }

  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [newTrip] = await db.insert(trips).values(trip).returning();
    return newTrip;
  }

  async getTripByCredentials(temporaryUsername: string, temporaryPassword: string): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined> {
    const [trip] = await db.select().from(trips)
      .where(and(
        eq(trips.temporaryUsername, temporaryUsername),
        eq(trips.temporaryPassword, temporaryPassword),
        eq(trips.status, "ACTIVE")
      ));
    
    if (!trip) return undefined;

    const driver = await this.getDriverByDriverNumber(trip.driverNumber);
    const vehicle = await this.getVehicleByVehicleNumber(trip.vehicleNumber);

    if (!driver || !vehicle) return undefined;

    return { ...trip, driver, vehicle };
  }

  async getActiveTripByDriverNumber(driverNumber: string): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined> {
    const [trip] = await db.select().from(trips)
      .where(and(
        eq(trips.driverNumber, driverNumber),
        eq(trips.status, "ACTIVE")
      ))
      .orderBy(desc(trips.createdAt))
      .limit(1);
    
    if (!trip) return undefined;

    const driver = await this.getDriverByDriverNumber(trip.driverNumber);
    const vehicle = await this.getVehicleByVehicleNumber(trip.vehicleNumber);

    if (!driver || !vehicle) return undefined;

    return { ...trip, driver, vehicle };
  }

  async getActiveTripByVehicleNumber(vehicleNumber: string): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined> {
    const [trip] = await db.select().from(trips)
      .where(and(
        eq(trips.vehicleNumber, vehicleNumber),
        eq(trips.status, "ACTIVE")
      ))
      .orderBy(desc(trips.createdAt))
      .limit(1);
    
    if (!trip) return undefined;

    const driver = await this.getDriverByDriverNumber(trip.driverNumber);
    const vehicle = await this.getVehicleByVehicleNumber(trip.vehicleNumber);

    if (!driver || !vehicle) return undefined;

    return { ...trip, driver, vehicle };
  }

  async getTripById(tripId: number): Promise<(Trip & { driver: Driver; vehicle: Vehicle }) | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.tripId, tripId));
    
    if (!trip) return undefined;

    const driver = await this.getDriverByDriverNumber(trip.driverNumber);
    const vehicle = await this.getVehicleByVehicleNumber(trip.vehicleNumber);

    if (!driver || !vehicle) return undefined;

    return { ...trip, driver, vehicle };
  }

  async completeTrip(tripId: number): Promise<Trip> {
    const [updated] = await db.update(trips)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(trips.tripId, tripId))
      .returning();
    return updated;
  }

  async cancelTrip(tripId: number): Promise<Trip> {
    const [updated] = await db.update(trips)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(eq(trips.tripId, tripId))
      .returning();
    return updated;
  }

  async getAllTrips(): Promise<(Trip & { driver: Driver; vehicle: Vehicle })[]> {
    const allTrips = await db.select().from(trips).orderBy(desc(trips.createdAt));
    
    const tripsWithRelations = await Promise.all(
      allTrips.map(async (trip) => {
        const driver = await this.getDriverByDriverNumber(trip.driverNumber);
        const vehicle = await this.getVehicleByVehicleNumber(trip.vehicleNumber);
        return { ...trip, driver: driver!, vehicle: vehicle! };
      })
    );

    return tripsWithRelations.filter(t => t.driver && t.vehicle);
  }

  async createEmergency(emergency: InsertEmergency): Promise<Emergency> {
    const [newEmergency] = await db.insert(emergencies).values(emergency).returning();
    return newEmergency;
  }

  async getActiveEmergencyForDriverVehicle(driverNumber: string, vehicleNumber: string): Promise<Emergency | undefined> {
    // Check if there's an active emergency created in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const [active] = await db.select().from(emergencies)
      .where(and(
        eq(emergencies.driverNumber, driverNumber),
        eq(emergencies.vehicleNumber, vehicleNumber),
        eq(emergencies.status, "ACTIVE")
      ))
      .orderBy(desc(emergencies.createdAt))
      .limit(1);
    
    // Only return if created within last 5 minutes (to prevent old emergencies from blocking new ones)
    if (active && new Date(active.createdAt || active.timestamp) > fiveMinutesAgo) {
      return active;
    }
    return undefined;
  }

  async updateEmergencyStatus(emergencyId: number, status: "ACKNOWLEDGED"): Promise<Emergency> {
    const [updated] = await db.update(emergencies)
      .set({ status })
      .where(eq(emergencies.emergencyId, emergencyId))
      .returning();
    return updated;
  }

  async updateAllActiveEmergenciesForDriverVehicle(driverNumber: string, vehicleNumber: string, status: "ACKNOWLEDGED"): Promise<Emergency[]> {
    const updated = await db.update(emergencies)
      .set({ status })
      .where(and(
        eq(emergencies.driverNumber, driverNumber),
        eq(emergencies.vehicleNumber, vehicleNumber),
        eq(emergencies.status, "ACTIVE")
      ))
      .returning();
    return updated;
  }

  async getAllEmergencies(): Promise<(Emergency & { driver: Driver; vehicle: Vehicle })[]> {
    const allEmergencies = await db.select().from(emergencies).orderBy(desc(emergencies.createdAt));
    
    const emergenciesWithRelations = await Promise.all(
      allEmergencies.map(async (emergency) => {
        const driver = await this.getDriverByDriverNumber(emergency.driverNumber);
        const vehicle = await this.getVehicleByVehicleNumber(emergency.vehicleNumber);
        return { ...emergency, driver: driver!, vehicle: vehicle! };
      })
    );

    return emergenciesWithRelations.filter(e => e.driver && e.vehicle);
  }

  async getEmergencyWithRelations(emergencyId: number): Promise<(Emergency & { driver: Driver; vehicle: Vehicle }) | undefined> {
    const [emergency] = await db.select().from(emergencies).where(eq(emergencies.emergencyId, emergencyId));
    
    if (!emergency) return undefined;

    const driver = await this.getDriverByDriverNumber(emergency.driverNumber);
    const vehicle = await this.getVehicleByVehicleNumber(emergency.vehicleNumber);

    if (!driver || !vehicle) return undefined;

    return { ...emergency, driver, vehicle };
  }

  async createFuelLog(log: InsertFuelLog): Promise<FuelLog> {
    const [newLog] = await db.insert(fuelLogs).values(log).returning();
    return newLog;
  }

  async getFuelLogs(vehicleNumber: string): Promise<FuelLog[]> {
    return await db.select().from(fuelLogs)
      .where(eq(fuelLogs.vehicleNumber, vehicleNumber))
      .orderBy(desc(fuelLogs.date));
  }

  async createServiceLog(log: InsertServiceLog): Promise<ServiceLog> {
    const [newLog] = await db.insert(serviceLogs).values(log).returning();
    return newLog;
  }

  async getServiceLogs(vehicleNumber: string): Promise<ServiceLog[]> {
    return await db.select().from(serviceLogs)
      .where(eq(serviceLogs.vehicleNumber, vehicleNumber))
      .orderBy(desc(serviceLogs.date));
  }
}

export const storage = new DatabaseStorage();
