import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { api, socketEvents } from "@shared/routes";
import { insertVehicleSchema, insertDriverSchema } from "@shared/schema";
import { z } from "zod";

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
    const { username, password } = req.body;
    const driver = await storage.getDriverByUsername(username);
    if (!driver || driver.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    res.json(driver);
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

  app.post(api.vehicles.assignDriver.path, async (req, res) => {
    const { vehicleId, driverId } = req.body;
    try {
      const vehicle = await storage.updateVehicleDriver(vehicleId, driverId);
      res.json(vehicle);
    } catch (err) {
      res.status(404).json({ message: "Vehicle or Driver not found" });
    }
  });

  app.get(api.vehicles.list.path, async (req, res) => {
    const vehicles = await storage.getAllVehicles();
    res.json(vehicles);
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

  // === FUEL & SERVICE API ===
  app.post(api.fuel.add.path, async (req, res) => {
    try {
      const log = await storage.createFuelLog(req.body);
      // Update vehicle mileage and fuel level
      await storage.updateVehicleStatus(req.body.vehicleId, { 
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
      const logs = await storage.getFuelLogs(parseInt(req.params.vehicleId));
      res.json(logs);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.service.add.path, async (req, res) => {
    try {
      const log = await storage.createServiceLog(req.body);
      await storage.updateVehicleStatus(req.body.vehicleId, { 
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
      const logs = await storage.getServiceLogs(parseInt(req.params.vehicleId));
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
      // req.body fields come as strings from FormData, need manual parsing/handling
      const driverId = parseInt(req.body.driverId);
      const vehicleId = parseInt(req.body.vehicleId);
      const location = JSON.parse(req.body.location);
      
      const videoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

      const emergency = await storage.createEmergency({
        driverId,
        vehicleId,
        location,
        videoUrl,
      });

      // Emit socket event
      io.emit(socketEvents.RECEIVE_EMERGENCY, {
        ...emergency,
        driver: await storage.getDriver(driverId),
        vehicle: await storage.getVehicle(vehicleId),
      });

      res.status(201).json(emergency);
    } catch (err) {
      console.error("Emergency Trigger Error:", err);
      res.status(500).json({ message: "Failed to trigger emergency" });
    }
  });

  app.post(api.emergency.acknowledge.path, async (req, res) => {
    const { emergencyId } = req.body;
    try {
      const emergency = await storage.updateEmergencyStatus(emergencyId, "ACKNOWLEDGED");
      io.emit(socketEvents.RECEIVE_ACKNOWLEDGEMENT, emergency);
      res.json(emergency);
    } catch (err) {
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
}

// Run seed (async, don't await blocking server start)
seed().catch(console.error);
