import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { api, socketEvents } from "@shared/routes";
import { insertVehicleSchema, insertDriverSchema } from "@shared/schema";
import { generateTemporaryCredentials, sendSMS, findNearbyFacilities } from "./utils";
import { z } from "zod";

// Emergency notification phone numbers (configured)
const POLICE_PHONE = process.env.POLICE_PHONE || "+1234567890";
const HOSPITAL_PHONE = process.env.HOSPITAL_PHONE || "+0987654321";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup
const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `emergency-${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storageConfig });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Socket.IO setup
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Join rooms based on roles (simulated for now, everyone listens to everything in MVP or room based)
    // For simplicity, we'll broadcast to everyone or specific rooms.

    socket.on(socketEvents.EMERGENCY_TRIGGERED, (data) => {
      console.log("Emergency triggered:", data);
      io.emit(socketEvents.RECEIVE_EMERGENCY, data);
    });

    socket.on(socketEvents.LOCATION_UPDATE, (data) => {
      // console.log("Location update:", data); // Noisy log
      io.emit(socketEvents.RECEIVE_LOCATION, data);
    });

    socket.on(socketEvents.ALARM_STOP, (data) => {
      io.emit(socketEvents.STOP_ALARM, data);
    });

    socket.on(socketEvents.ACKNOWLEDGEMENT_SENT, (data) => {
      io.emit(socketEvents.RECEIVE_ACKNOWLEDGEMENT, data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    // Basic static serve
    const filePath = path.join(uploadDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      next();
    }
  });

  // === AUTH API ===
  app.post(api.auth.managerLogin.path, async (req, res) => {
    const { username, password } = req.body;
    const manager = await storage.getManagerByUsername(username);
    // In a real app, use bcrypt. Here we compare plaintext for simplicity/MVP as per instructions "Laptop Simulation".
    if (!manager || manager.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Set simple session/cookie or just return user object for frontend state
    // For this MVP, returning user object is enough for frontend localStorage
    res.json(manager);
  });

  app.post(api.auth.driverLogin.path, async (req, res) => {
    const { temporaryUsername, temporaryPassword } = req.body;
    const trip = await storage.getTripByCredentials(temporaryUsername, temporaryPassword);
    if (!trip) {
      return res.status(401).json({ message: "Invalid temporary credentials or trip expired" });
    }
    res.json(trip);
  });

  app.post(api.auth.logout.path, (req, res) => {
    res.json({ message: "Logged out" });
  });

  // === VEHICLE API ===
  app.post(api.vehicles.register.path, async (req, res) => {
    try {
      const input = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(input);
      res.status(201).json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.trips.assign.path, async (req, res) => {
    const { driverNumber, vehicleNumber } = req.body;
    try {
      const driver = await storage.getDriverByDriverNumber(driverNumber);
      const vehicle = await storage.getVehicleByVehicleNumber(vehicleNumber);
      
      if (!driver || !vehicle) {
        return res.status(404).json({ message: "Driver or Vehicle not found" });
      }

      // Check if driver or vehicle already has active trip
      const existingDriverTrip = await storage.getActiveTripByDriverNumber(driverNumber);
      const existingVehicleTrip = await storage.getActiveTripByVehicleNumber(vehicleNumber);
      
      if (existingDriverTrip || existingVehicleTrip) {
        return res.status(400).json({ message: "Driver or Vehicle already has an active trip" });
      }

      // Generate temporary credentials
      const { temporaryUsername, temporaryPassword } = generateTemporaryCredentials();

      // Create trip
      const trip = await storage.createTrip({
        driverNumber,
        vehicleNumber,
        temporaryUsername,
        temporaryPassword,
        status: "ACTIVE",
      });

      // Get full trip with relations
      const fullTrip = await storage.getTripByCredentials(temporaryUsername, temporaryPassword);
      if (!fullTrip) {
        return res.status(500).json({ message: "Failed to create trip" });
      }

      // Send SMS notification
      const smsMessage = `Trip Assignment\nVehicle: ${vehicleNumber}\nDriver: ${driver.name}\nTemporary Username: ${temporaryUsername}\nTemporary Password: ${temporaryPassword}\n\nLogin at: ${req.protocol}://${req.get('host')}/login/driver`;
      await sendSMS(driver.phoneNumber, smsMessage);

      res.json(fullTrip);
    } catch (err) {
      console.error("Trip assignment error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.vehicles.list.path, async (req, res) => {
    const vehicles = await storage.getAllVehicles();
    res.json(vehicles);
  });

  app.post(api.trips.complete.path, async (req, res) => {
    const { tripId } = req.body;
    try {
      const trip = await storage.completeTrip(tripId);
      res.json(trip);
    } catch (err) {
      res.status(404).json({ message: "Trip not found" });
    }
  });

  app.post(api.trips.cancel.path, async (req, res) => {
    const { tripId } = req.body;
    try {
      const fullTrip = await storage.getTripById(tripId);
      if (!fullTrip) {
        return res.status(404).json({ message: "Trip not found" });
      }

      const trip = await storage.cancelTrip(tripId);
      
      // Send cancellation SMS to driver
      const smsMessage = `Trip Cancelled\nYour trip assignment has been cancelled.\nVehicle: ${fullTrip.vehicleNumber}\nDriver: ${fullTrip.driver.name}\n\nPlease contact management for details.`;
      await sendSMS(fullTrip.driver.phoneNumber, smsMessage);

      res.json(trip);
    } catch (err) {
      res.status(404).json({ message: "Trip not found" });
    }
  });

  app.get(api.trips.list.path, async (req, res) => {
    const trips = await storage.getAllTrips();
    res.json(trips);
  });

  app.get(api.trips.getCurrent.path, async (req, res) => {
    try {
      const temporaryUsername = req.query.temporaryUsername as string;
      if (!temporaryUsername) {
        return res.status(400).json({ message: "Temporary username required" });
      }
      const trip = await storage.getTripByCredentials(temporaryUsername, req.query.temporaryPassword as string);
      if (!trip) {
        return res.status(404).json({ message: "Active trip not found" });
      }
      res.json(trip);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.vehicles.update.path, async (req, res) => {
    try {
      const vehicleNumber = req.params.vehicleNumber;
      const vehicle = await storage.updateVehicle(vehicleNumber, req.body);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.vehicles.updateStatus.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vehicle = await storage.updateVehicleStatus(id, req.body);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.drivers.update.path, async (req, res) => {
    try {
      const driverNumber = req.params.driverNumber;
      const driver = await storage.updateDriver(driverNumber, req.body);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
      res.json(driver);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === FUEL & SERVICE API ===
  app.post(api.fuel.add.path, async (req, res) => {
    try {
      const log = await storage.createFuelLog(req.body);
      // Update vehicle mileage and fuel level
      await storage.updateVehicleStatus(req.body.vehicleNumber, { 
        currentMileage: req.body.mileage,
        currentFuel: 100 // Assume full tank after log
      });
      res.status(201).json(log);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.fuel.list.path, async (req, res) => {
    try {
      const logs = await storage.getFuelLogs(req.params.vehicleNumber);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.service.add.path, async (req, res) => {
    try {
      const log = await storage.createServiceLog(req.body);
      await storage.updateVehicleStatus(req.body.vehicleNumber, { 
        currentMileage: req.body.mileage,
        lastServiceDate: new Date()
      });
      res.status(201).json(log);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.service.list.path, async (req, res) => {
    try {
      const logs = await storage.getServiceLogs(req.params.vehicleNumber);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === DRIVER API ===
  app.post(api.drivers.register.path, async (req, res) => {
    try {
      const input = insertDriverSchema.parse(req.body);
      const driver = await storage.createDriver(input);
      res.status(201).json(driver);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.drivers.list.path, async (req, res) => {
    const drivers = await storage.getAllDrivers();
    res.json(drivers);
  });


  // === EMERGENCY API ===
  app.post(api.emergency.trigger.path, upload.single("video"), async (req, res) => {
    try {
      const driverNumber = req.body.driverNumber;
      const vehicleNumber = req.body.vehicleNumber;
      
      // Check if there's already an active emergency for this driver/vehicle (within last 5 minutes)
      const existingActive = await storage.getActiveEmergencyForDriverVehicle(driverNumber, vehicleNumber);
      if (existingActive) {
        // Return existing emergency instead of creating duplicate
        const driver = await storage.getDriverByDriverNumber(driverNumber);
        const vehicle = await storage.getVehicleByVehicleNumber(vehicleNumber);
        if (driver && vehicle) {
          const nearbyFacilities = findNearbyFacilities(
            parseFloat(String(existingActive.latitude)),
            parseFloat(String(existingActive.longitude)),
            POLICE_PHONE,
            HOSPITAL_PHONE
          );
          return res.status(200).json({
            ...existingActive,
            driver,
            vehicle,
            nearbyFacilities,
            message: "Emergency already active for this driver/vehicle"
          });
        }
      }
      
      let location;
      try {
        location = typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location;
      } catch {
        location = { latitude: parseFloat(req.body.latitude), longitude: parseFloat(req.body.longitude) };
      }
      
      if (!location || (!location.latitude && !location.lat) || (!location.longitude && !location.lng)) {
        return res.status(400).json({ message: "Location is required" });
      }

      const latitude = parseFloat(String(location.latitude || location.lat));
      const longitude = parseFloat(String(location.longitude || location.lng));

      const videoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

      const emergency = await storage.createEmergency({
        driverNumber,
        vehicleNumber,
        latitude: String(latitude),
        longitude: String(longitude),
        videoUrl,
      });

      const driver = await storage.getDriverByDriverNumber(driverNumber);
      const vehicle = await storage.getVehicleByVehicleNumber(vehicleNumber);

      if (!driver || !vehicle) {
        return res.status(404).json({ message: "Driver or vehicle not found" });
      }

      // Find nearby facilities
      const nearbyFacilities = findNearbyFacilities(latitude, longitude, POLICE_PHONE, HOSPITAL_PHONE);

      // Emit socket event to all dashboards (manager, police, hospital)
      const emergencyData = {
        ...emergency,
        driver,
        vehicle,
        nearbyFacilities,
      };

      io.emit(socketEvents.RECEIVE_EMERGENCY, emergencyData);

      // Send emergency notifications to police and hospital
      const emergencyMessage = `EMERGENCY ALERT\nDriver: ${driver.name} (${driverNumber})\nVehicle: ${vehicleNumber}\nLocation: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nTime: ${new Date().toLocaleString()}`;
      
      await sendSMS(POLICE_PHONE, emergencyMessage);
      await sendSMS(HOSPITAL_PHONE, emergencyMessage);

      res.status(201).json(emergency);
    } catch (err) {
      console.error("Emergency Trigger Error:", err);
      res.status(500).json({ message: "Failed to trigger emergency" });
    }
  });

  app.get(api.emergency.nearbyFacilities.path, async (req, res) => {
    try {
      const latitude = parseFloat(req.query.latitude as string);
      const longitude = parseFloat(req.query.longitude as string);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Valid latitude and longitude required" });
      }

      const facilities = findNearbyFacilities(latitude, longitude, POLICE_PHONE, HOSPITAL_PHONE);
      res.json(facilities);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.emergency.acknowledge.path, async (req, res) => {
    const { emergencyId } = req.body;
    try {
      // Get the emergency first to get driver/vehicle info
      const fullEmergency = await storage.getEmergencyWithRelations(emergencyId);
      
      if (!fullEmergency) {
        return res.status(404).json({ message: "Emergency not found" });
      }

      // Acknowledge the specific emergency
      const emergency = await storage.updateEmergencyStatus(emergencyId, "ACKNOWLEDGED");
      
      // Also acknowledge ALL other active emergencies for the same driver/vehicle
      // This fixes the issue where hundreds of emergencies were created
      const allAcknowledged = await storage.updateAllActiveEmergenciesForDriverVehicle(
        fullEmergency.driverNumber,
        fullEmergency.vehicleNumber,
        "ACKNOWLEDGED"
      );
      
      console.log(`[EMERGENCY ACK] Acknowledged ${allAcknowledged.length} emergencies for ${fullEmergency.driverNumber}/${fullEmergency.vehicleNumber}`);
      
      // Emit stop alarm to all clients (driver, manager, police, hospital)
      io.emit(socketEvents.STOP_ALARM, { 
        emergencyId,
        driverNumber: fullEmergency.driverNumber,
        vehicleNumber: fullEmergency.vehicleNumber
      });
      
      // Emit acknowledgment to driver
      io.emit(socketEvents.RECEIVE_ACKNOWLEDGEMENT, {
        emergencyId,
        message: "Emergency acknowledged by manager",
        emergency: fullEmergency
      });
      
      res.json(emergency);
    } catch (err) {
      console.error("Acknowledge error:", err);
      res.status(404).json({ message: "Emergency not found" });
    }
  });

  app.get(api.emergency.list.path, async (req, res) => {
    const emergencies = await storage.getAllEmergencies();
    res.json(emergencies);
  });

  return httpServer;
}

// Seed function to create initial manager and data
async function seed() {
  const existingManager = await storage.getManagerByUsername("admin");
  if (!existingManager) {
    await storage.createManager({ username: "admin", password: "password123" });
    console.log("Seeded Manager: admin / password123");
  }

  const vehicles = await storage.getAllVehicles();
  if (vehicles.length > 0) {
    const v = vehicles[0];
    const fuelLogs = await storage.getFuelLogs(v.vehicleNumber);
    if (fuelLogs.length === 0) {
      await storage.createFuelLog({
        vehicleNumber: v.vehicleNumber,
        amount: "45.5",
        cost: "68.25",
        mileage: 1250,
      });
      await storage.createServiceLog({
        vehicleNumber: v.vehicleNumber,
        description: "Routine Oil Change and Brake Inspection",
        cost: "150.00",
        mileage: 1200,
      });
      await storage.updateVehicleStatus(v.vehicleNumber, {
        currentMileage: 1250,
        currentFuel: 85,
        lastServiceDate: new Date(),
        nextServiceMileage: 5000,
      });
      console.log("Seeded maintenance data for vehicle:", v.vehicleNumber);
    }
  }
}

// Run seed (async, don't await blocking server start)
seed().catch(console.error);
