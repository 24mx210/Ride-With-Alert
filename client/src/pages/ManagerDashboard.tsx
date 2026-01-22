import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useVehicles, useDrivers, useTrips, useRegisterVehicle, useRegisterDriver, useAssignTrip, useCompleteTrip, useCancelTrip, useUpdateVehicle, useUpdateDriver } from "@/hooks/use-fleet";
import { useEmergencies, useSocket } from "@/hooks/use-emergency";
import { useSocket as useSocketHook } from "@/hooks/use-socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map } from "@/components/Map";
import { EmergencyAlert } from "@/components/EmergencyAlert";
import { LayoutDashboard, Car, Users, LogOut, Radio, AlertOctagon, Settings, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Emergency, Vehicle, Driver } from "@shared/schema";

export default function ManagerDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("monitoring");
  const { socket, subscribe, events } = useSocketHook();
  const { toast } = useToast();
  
  // Data Fetching
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const { data: trips } = useTrips();
  const { data: emergencies, refetch: refetchEmergencies } = useEmergencies();
  
  // Mutations
  const registerVehicle = useRegisterVehicle();
  const registerDriver = useRegisterDriver();
  const assignTrip = useAssignTrip();
  const completeTrip = useCompleteTrip();
  const cancelTrip = useCancelTrip();
  const updateVehicle = useUpdateVehicle();
  const updateDriver = useUpdateDriver();

  // Local State for Forms
  const [newVehicle, setNewVehicle] = useState({ vehicleNumber: "", vehicleType: "Ambulance", fuelCapacity: 50 });
  const [newDriver, setNewDriver] = useState({ driverNumber: "", name: "", phoneNumber: "", licenseNumber: "" });
  const [assignment, setAssignment] = useState({ vehicleNumber: "", driverNumber: "" });
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<string | null>(null);
  const [editVehicleData, setEditVehicleData] = useState({ vehicleType: "", fuelCapacity: 0 });
  const [editDriverData, setEditDriverData] = useState({ name: "", phoneNumber: "", licenseNumber: "" });
  
  // Real-time Emergency Handling
  const [activeEmergency, setActiveEmergency] = useState<(Emergency & { driver: Driver; vehicle: Vehicle }) | null>(null);

  useEffect(() => {
    // Listen for new emergencies via WebSocket
    const unsubscribeEmergency = subscribe(events.RECEIVE_EMERGENCY, (data) => {
      console.log("Emergency received:", data);
      refetchEmergencies();
      // Show popup alert if not already showing one
      if (!activeEmergency) {
        setActiveEmergency(data);
      } else {
        toast({
          title: "ANOTHER EMERGENCY!",
          description: `Vehicle ${data.vehicle.vehicleNumber} triggered SOS!`,
          variant: "destructive",
        });
      }
    });

    const unsubscribeLocation = subscribe(events.RECEIVE_LOCATION, (data) => {
      // Update vehicle locations in real-time
      // This would update the map markers dynamically
      refetchEmergencies();
    });

    // Listen for stop alarm to clear active emergency
    const unsubscribeStopAlarm = subscribe(events.STOP_ALARM, (data) => {
      if (activeEmergency) {
        // Clear if it matches the emergencyId, or if it matches driver/vehicle (bulk acknowledgment)
        if (!data.emergencyId || 
            data.emergencyId === activeEmergency.emergencyId ||
            (data.driverNumber === activeEmergency.driverNumber && data.vehicleNumber === activeEmergency.vehicleNumber)) {
          setActiveEmergency(null);
        }
      }
      refetchEmergencies();
    });
    
    // Check if there are any existing active emergencies on load
    // Only show the MOST RECENT active emergency to prevent blinking from multiple emergencies
    if (emergencies && emergencies.length > 0) {
      const activeEmergencies = emergencies.filter(e => e.status === "ACTIVE");
      if (activeEmergencies.length > 0) {
        // Get the most recent one (already sorted by createdAt desc)
        const mostRecent = activeEmergencies[0];
        if (!activeEmergency) {
          setActiveEmergency(mostRecent);
        } else if (activeEmergency.emergencyId !== mostRecent.emergencyId) {
          // Update to most recent if different
          setActiveEmergency(mostRecent);
        }
      } else if (activeEmergency) {
        // No active emergencies, clear it
        setActiveEmergency(null);
      }
    } else if (activeEmergency) {
      // No emergencies in list, clear active
      setActiveEmergency(null);
    }

    return () => {
      unsubscribeEmergency?.();
      unsubscribeLocation?.();
      unsubscribeStopAlarm?.();
    };
  }, [subscribe, events, refetchEmergencies, emergencies, activeEmergency]);

  // Map Markers Construction
  const [vehicleLocations, setVehicleLocations] = useState<Record<number, { lat: number; lng: number }>>({});

  useEffect(() => {
    const unsubscribe = subscribe(events.RECEIVE_LOCATION, (data: { vehicleNumber: string; location: { lat: number; lng: number } }) => {
      setVehicleLocations(prev => ({
        ...prev,
        [data.vehicleNumber]: data.location
      }));
    });

    return () => {
      unsubscribe?.();
    };
  }, [subscribe, events]);

  const mapMarkers = [
    // Vehicles with real-time locations
    ...(vehicles?.map(v => {
      const location = vehicleLocations[v.vehicleNumber] || { lat: 40.7128 + (Math.random() * 0.05), lng: -74.0060 + (Math.random() * 0.05) };
      return {
        id: v.vehicleNumber,
        lat: location.lat,
        lng: location.lng,
        title: `Vehicle: ${v.vehicleNumber}`,
        type: "vehicle" as const,
        details: `Type: ${v.vehicleType}`
      };
    }) || []),
    // Emergencies override vehicle positions
    ...(emergencies?.filter(e => 
      e.status === "ACTIVE" && 
      e.latitude && 
      e.longitude &&
      e.driver &&
      e.vehicle
    ).map(e => ({
      id: e.emergencyId || e.id,
      lat: parseFloat(String(e.latitude)),
      lng: parseFloat(String(e.longitude)),
      title: "EMERGENCY ALERT",
      type: "emergency" as const,
      details: `Driver: ${e.driver.name} | Vehicle: ${e.vehicle.vehicleNumber} | Time: ${new Date(e.createdAt || e.timestamp || "").toLocaleTimeString()}`
    })) || [])
  ];

  const handleRegisterVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    registerVehicle.mutate(newVehicle, {
      onSuccess: () => setNewVehicle({ vehicleNumber: "", vehicleType: "Ambulance", fuelCapacity: 50 })
    });
  };

  const handleRegisterDriver = (e: React.FormEvent) => {
    e.preventDefault();
    registerDriver.mutate(newDriver, {
      onSuccess: () => setNewDriver({ driverNumber: "", name: "", phoneNumber: "", licenseNumber: "" })
    });
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignment.vehicleNumber && assignment.driverNumber) {
      assignTrip.mutate({ 
        vehicleNumber: assignment.vehicleNumber, 
        driverNumber: assignment.driverNumber 
      });
      setAssignment({ vehicleNumber: "", driverNumber: "" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold font-display">Mission Control</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${socket?.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
              {socket?.connected ? 'System Online' : 'Connecting...'}
            </div>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white p-1 shadow-sm border border-slate-200">
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Radio className="w-4 h-4 mr-2" /> Live Monitoring
            </TabsTrigger>
            <TabsTrigger value="fleet" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Car className="w-4 h-4 mr-2" /> Fleet Management
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" /> Maintenance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
              {/* Active Alerts Sidebar */}
              <Card className="col-span-1 flex flex-col h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Active Alerts</span>
                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold">
                      {emergencies?.filter(e => e.status === "ACTIVE").length || 0}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                  {emergencies?.filter(e => e.status === "ACTIVE").length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                      <ShieldCheck className="w-10 h-10 mb-2" />
                      <p>All clear. No active emergencies.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {emergencies?.filter(e => e.status === "ACTIVE").map(emergency => (
                        <div key={emergency.emergencyId} className="p-4 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer border-l-4 border-red-500" onClick={() => setActiveEmergency(emergency)}>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-red-700">Vehicle {emergency.vehicle.vehicleNumber}</h4>
                            <span className="text-xs text-red-500 font-mono">
                              {new Date(emergency.createdAt || "").toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-red-600 mb-2">Driver: {emergency.driver.name}</p>
                          <Button size="sm" variant="destructive" className="w-full" onClick={(e) => { e.stopPropagation(); setActiveEmergency(emergency); }}>
                            View Details
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="p-4 border-t border-slate-100 mt-auto">
                    <h3 className="font-bold text-slate-700 mb-2 text-sm uppercase tracking-wide">Vehicle Status</h3>
                    <div className="space-y-2">
                       {vehicles?.map(v => {
                         const activeTrip = trips?.find(t => t.vehicleNumber === v.vehicleNumber && t.status === "ACTIVE");
                         return (
                           <div key={v.vehicleNumber} className="flex items-center justify-between text-sm p-2 rounded hover:bg-slate-50">
                             <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${activeTrip ? 'bg-green-500' : 'bg-slate-300'}`} />
                               <span className="font-medium">{v.vehicleNumber}</span>
                             </div>
                             <span className="text-slate-500 text-xs">
                               {activeTrip ? `${activeTrip.driver.name}` : 'No Active Trip'}
                             </span>
                           </div>
                         );
                       })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Map */}
              <div className="col-span-1 lg:col-span-2 h-full rounded-xl overflow-hidden shadow-md border border-slate-200">
                <Map center={[40.7128, -74.0060]} zoom={12} markers={mapMarkers} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fleet Maintenance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {vehicles?.map(v => (
                      <div key={v.id} className="py-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold">{v.vehicleNumber} ({v.vehicleType})</p>
                          <p className="text-sm text-slate-500">Mileage: {v.currentMileage} km | Fuel: {v.currentFuel}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">Last Service: {v.lastServiceDate ? new Date(v.lastServiceDate).toLocaleDateString() : 'Never'}</p>
                          <p className={`text-sm font-bold ${v.nextServiceMileage && v.currentMileage && v.nextServiceMileage - v.currentMileage < 500 ? 'text-red-500' : 'text-green-500'}`}>
                            Next Service: {v.nextServiceMileage} km
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fleet" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Register Vehicle */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Car className="w-5 h-5" /> Add Vehicle</CardTitle>
                  <CardDescription>Register a new vehicle to the fleet database.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegisterVehicle} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vehicle Number</Label>
                        <Input 
                          placeholder="AMB-001" 
                          value={newVehicle.vehicleNumber}
                          onChange={e => setNewVehicle({...newVehicle, vehicleNumber: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fuel Capacity (L)</Label>
                        <Input 
                          type="number" 
                          value={newVehicle.fuelCapacity}
                          onChange={e => setNewVehicle({...newVehicle, fuelCapacity: parseInt(e.target.value)})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select 
                        value={newVehicle.vehicleType} 
                        onValueChange={val => setNewVehicle({...newVehicle, vehicleType: val})}
                      >
                         <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="Ambulance">Ambulance</SelectItem>
                           <SelectItem value="Police">Police</SelectItem>
                           <SelectItem value="Truck">Truck</SelectItem>
                         </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={registerVehicle.isPending}>
                      {registerVehicle.isPending ? "Adding..." : "Register Vehicle"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Register Driver */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Add Driver</CardTitle>
                  <CardDescription>Create credentials for new driver personnel.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegisterDriver} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Driver Number</Label>
                      <Input 
                        placeholder="DRV-001"
                        value={newDriver.driverNumber}
                        onChange={e => setNewDriver({...newDriver, driverNumber: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input 
                          value={newDriver.name}
                          onChange={e => setNewDriver({...newDriver, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input 
                          value={newDriver.phoneNumber}
                          onChange={e => setNewDriver({...newDriver, phoneNumber: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>License Number</Label>
                      <Input 
                        value={newDriver.licenseNumber}
                        onChange={e => setNewDriver({...newDriver, licenseNumber: e.target.value})}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={registerDriver.isPending}>
                      {registerDriver.isPending ? "Creating..." : "Create Profile"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Assign Trip */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Assign Trip - Driver to Vehicle</CardTitle>
                  <CardDescription>Create a trip session with temporary credentials. SMS will be sent to driver.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAssign} className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Select Vehicle</Label>
                      <Select 
                        value={assignment.vehicleNumber} 
                        onValueChange={val => setAssignment({...assignment, vehicleNumber: val})}
                      >
                         <SelectTrigger><SelectValue placeholder="Choose vehicle" /></SelectTrigger>
                         <SelectContent>
                           {vehicles?.map(v => (
                             <SelectItem key={v.vehicleNumber} value={v.vehicleNumber}>
                               {v.vehicleNumber} ({v.vehicleType})
                             </SelectItem>
                           ))}
                         </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Select Driver</Label>
                      <Select 
                        value={assignment.driverNumber} 
                        onValueChange={val => setAssignment({...assignment, driverNumber: val})}
                      >
                         <SelectTrigger><SelectValue placeholder="Choose driver" /></SelectTrigger>
                         <SelectContent>
                           {drivers?.map(d => (
                             <SelectItem key={d.driverNumber} value={d.driverNumber}>
                               {d.name} ({d.driverNumber})
                             </SelectItem>
                           ))}
                         </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={assignTrip.isPending}>
                      {assignTrip.isPending ? "Assigning..." : "Assign Trip"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Active Trips */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Active Trips</CardTitle>
                  <CardDescription>Manage active trip sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {trips?.filter(t => t.status === "ACTIVE").length === 0 ? (
                      <p className="text-slate-500 text-center py-4">No active trips</p>
                    ) : (
                      trips?.filter(t => t.status === "ACTIVE").map(trip => (
                        <div key={trip.tripId} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-bold">{trip.driver.name} ({trip.driverNumber})</p>
                            <p className="text-sm text-slate-500">Vehicle: {trip.vehicle.vehicleNumber}</p>
                            <p className="text-xs text-slate-400">Started: {new Date(trip.createdAt || "").toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => cancelTrip.mutate(trip.tripId)}
                              disabled={cancelTrip.isPending || completeTrip.isPending}
                            >
                              {cancelTrip.isPending ? "Cancelling..." : "Cancel Trip"}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => completeTrip.mutate(trip.tripId)}
                              disabled={completeTrip.isPending || cancelTrip.isPending}
                            >
                              {completeTrip.isPending ? "Completing..." : "Complete Trip"}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Update Vehicle */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Update Vehicle</CardTitle>
                  <CardDescription>Update existing vehicle information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Vehicle to Update</Label>
                      <Select 
                        value={editingVehicle || ""} 
                        onValueChange={(val) => {
                          setEditingVehicle(val);
                          const vehicle = vehicles?.find(v => v.vehicleNumber === val);
                          if (vehicle) {
                            setEditVehicleData({
                              vehicleType: vehicle.vehicleType,
                              fuelCapacity: vehicle.fuelCapacity
                            });
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Choose vehicle to update" /></SelectTrigger>
                        <SelectContent>
                          {vehicles?.map(v => (
                            <SelectItem key={v.vehicleNumber} value={v.vehicleNumber}>
                              {v.vehicleNumber} ({v.vehicleType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editingVehicle && (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        updateVehicle.mutate({ vehicleNumber: editingVehicle, updates: editVehicleData }, {
                          onSuccess: () => {
                            setEditingVehicle(null);
                            setEditVehicleData({ vehicleType: "", fuelCapacity: 0 });
                          }
                        });
                      }} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Vehicle Type</Label>
                          <Select 
                            value={editVehicleData.vehicleType} 
                            onValueChange={val => setEditVehicleData({...editVehicleData, vehicleType: val})}
                          >
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Ambulance">Ambulance</SelectItem>
                              <SelectItem value="Police">Police</SelectItem>
                              <SelectItem value="Truck">Truck</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Fuel Capacity (L)</Label>
                          <Input 
                            type="number" 
                            value={editVehicleData.fuelCapacity}
                            onChange={e => setEditVehicleData({...editVehicleData, fuelCapacity: parseInt(e.target.value)})}
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={updateVehicle.isPending}>
                            {updateVehicle.isPending ? "Updating..." : "Update Vehicle"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => {
                            setEditingVehicle(null);
                            setEditVehicleData({ vehicleType: "", fuelCapacity: 0 });
                          }}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Update Driver */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Update Driver</CardTitle>
                  <CardDescription>Update existing driver information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Driver to Update</Label>
                      <Select 
                        value={editingDriver || ""} 
                        onValueChange={(val) => {
                          setEditingDriver(val);
                          const driver = drivers?.find(d => d.driverNumber === val);
                          if (driver) {
                            setEditDriverData({
                              name: driver.name,
                              phoneNumber: driver.phoneNumber,
                              licenseNumber: driver.licenseNumber
                            });
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Choose driver to update" /></SelectTrigger>
                        <SelectContent>
                          {drivers?.map(d => (
                            <SelectItem key={d.driverNumber} value={d.driverNumber}>
                              {d.name} ({d.driverNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editingDriver && (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        updateDriver.mutate({ driverNumber: editingDriver, updates: editDriverData }, {
                          onSuccess: () => {
                            setEditingDriver(null);
                            setEditDriverData({ name: "", phoneNumber: "", licenseNumber: "" });
                          }
                        });
                      }} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input 
                              value={editDriverData.name}
                              onChange={e => setEditDriverData({...editDriverData, name: e.target.value})}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input 
                              value={editDriverData.phoneNumber}
                              onChange={e => setEditDriverData({...editDriverData, phoneNumber: e.target.value})}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>License Number</Label>
                          <Input 
                            value={editDriverData.licenseNumber}
                            onChange={e => setEditDriverData({...editDriverData, licenseNumber: e.target.value})}
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={updateDriver.isPending}>
                            {updateDriver.isPending ? "Updating..." : "Update Driver"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => {
                            setEditingDriver(null);
                            setEditDriverData({ name: "", phoneNumber: "", licenseNumber: "" });
                          }}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <EmergencyAlert 
        emergency={activeEmergency} 
        onClose={() => setActiveEmergency(null)} 
      />
    </div>
  );
}
