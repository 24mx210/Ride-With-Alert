import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useVehicles, useDrivers, useRegisterVehicle, useRegisterDriver, useAssignDriver } from "@/hooks/use-fleet";
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
import { LayoutDashboard, Car, Users, LogOut, Radio, AlertOctagon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Emergency, Vehicle, Driver } from "@shared/schema";

export default function ManagerDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("monitoring");
  const { socket, subscribe, events } = useSocketHook();
  const { toast } = useToast();
  
  // Data Fetching
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const { data: emergencies, refetch: refetchEmergencies } = useEmergencies();
  
  // Mutations
  const registerVehicle = useRegisterVehicle();
  const registerDriver = useRegisterDriver();
  const assignDriver = useAssignDriver();

  // Local State for Forms
  const [newVehicle, setNewVehicle] = useState({ vehicleNumber: "", type: "Ambulance", fuelCapacity: 50 });
  const [newDriver, setNewDriver] = useState({ name: "", username: "", password: "", phone: "", licenseNumber: "" });
  const [assignment, setAssignment] = useState({ vehicleId: "", driverId: "" });
  
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

    const unsubscribeLocation = subscribe(events.RECEIVE_LOCATION, () => {
      // In a real app, update map markers state here without full refetch
      // For now, we'll just rely on map re-render or refetch if we implemented granular updates
    });
    
    // Check if there are any existing active emergencies on load
    if (emergencies && emergencies.length > 0) {
      const active = emergencies.find(e => e.status === "ACTIVE");
      if (active && !activeEmergency) {
        setActiveEmergency(active);
      }
    }

    return () => {
      unsubscribeEmergency?.();
      unsubscribeLocation?.();
    };
  }, [subscribe, events, refetchEmergencies, emergencies]);

  // Map Markers Construction
  const mapMarkers = [
    // Vehicles (mock locations for demo if real ones missing)
    ...(vehicles?.map(v => ({
      id: v.id,
      lat: 40.7128 + (Math.random() * 0.05 - 0.025), // Mock lat around NYC
      lng: -74.0060 + (Math.random() * 0.05 - 0.025), // Mock lng
      title: `Vehicle: ${v.vehicleNumber}`,
      type: "vehicle" as const,
      details: v.driver ? `Driver: ${v.driver.name}` : "No Driver Assigned"
    })) || []),
    // Emergencies override vehicle positions
    ...(emergencies?.filter(e => e.status === "ACTIVE").map(e => ({
      id: e.id,
      lat: e.location.latitude,
      lng: e.location.longitude,
      title: "EMERGENCY ALERT",
      type: "emergency" as const,
      details: `Driver: ${e.driver.name} | Time: ${new Date(e.createdAt || "").toLocaleTimeString()}`
    })) || [])
  ];

  const handleRegisterVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    registerVehicle.mutate(newVehicle, {
      onSuccess: () => setNewVehicle({ vehicleNumber: "", type: "Ambulance", fuelCapacity: 50 })
    });
  };

  const handleRegisterDriver = (e: React.FormEvent) => {
    e.preventDefault();
    registerDriver.mutate(newDriver, {
      onSuccess: () => setNewDriver({ name: "", username: "", password: "", phone: "", licenseNumber: "" })
    });
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (assignment.vehicleId && assignment.driverId) {
      assignDriver.mutate({ 
        vehicleId: parseInt(assignment.vehicleId), 
        driverId: parseInt(assignment.driverId) 
      });
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
          </TabsList>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
              {/* Sidebar List */}
              <Card className="col-span-1 border-slate-200 shadow-md h-full flex flex-col overflow-hidden">
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
                        <div key={emergency.id} className="p-4 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer border-l-4 border-red-500" onClick={() => setActiveEmergency(emergency)}>
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
                       {vehicles?.map(v => (
                         <div key={v.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-slate-50">
                           <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${v.driver ? 'bg-green-500' : 'bg-slate-300'}`} />
                             <span className="font-medium">{v.vehicleNumber}</span>
                           </div>
                           <span className="text-slate-500 text-xs">{v.driver ? v.driver.name : 'Unassigned'}</span>
                         </div>
                       ))}
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
                        value={newVehicle.type} 
                        onValueChange={val => setNewVehicle({...newVehicle, type: val})}
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
                        <Label>Phone</Label>
                        <Input 
                          value={newDriver.phone}
                          onChange={e => setNewDriver({...newDriver, phone: e.target.value})}
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <Input 
                          value={newDriver.username}
                          onChange={e => setNewDriver({...newDriver, username: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input 
                          type="password"
                          value={newDriver.password}
                          onChange={e => setNewDriver({...newDriver, password: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={registerDriver.isPending}>
                      {registerDriver.isPending ? "Creating..." : "Create Profile"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Assign Driver */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Assign Driver to Vehicle</CardTitle>
                  <CardDescription>Link a driver profile to a fleet vehicle.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAssign} className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Select Vehicle</Label>
                      <Select 
                        value={assignment.vehicleId} 
                        onValueChange={val => setAssignment({...assignment, vehicleId: val})}
                      >
                         <SelectTrigger><SelectValue placeholder="Choose vehicle" /></SelectTrigger>
                         <SelectContent>
                           {vehicles?.map(v => (
                             <SelectItem key={v.id} value={v.id.toString()}>
                               {v.vehicleNumber} ({v.type}) {v.driverId ? '- Assigned' : ''}
                             </SelectItem>
                           ))}
                         </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Select Driver</Label>
                      <Select 
                        value={assignment.driverId} 
                        onValueChange={val => setAssignment({...assignment, driverId: val})}
                      >
                         <SelectTrigger><SelectValue placeholder="Choose driver" /></SelectTrigger>
                         <SelectContent>
                           {drivers?.map(d => (
                             <SelectItem key={d.id} value={d.id.toString()}>
                               {d.name} {d.vehicleId ? '- Assigned' : ''}
                             </SelectItem>
                           ))}
                         </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={assignDriver.isPending}>
                      {assignDriver.isPending ? "Assigning..." : "Assign"}
                    </Button>
                  </form>
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
