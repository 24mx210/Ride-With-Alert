import { useState, useEffect } from "react";
import { useEmergencies } from "@/hooks/use-emergency";
import { useSocket } from "@/hooks/use-socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map } from "@/components/Map";
import { Heart, MapPin, Video, AlertTriangle } from "lucide-react";
import { Emergency, Driver, Vehicle } from "@shared/schema";

export default function HospitalDashboard() {
  const { socket, subscribe, events } = useSocket();
  const { data: emergencies, refetch } = useEmergencies();
  const [activeEmergency, setActiveEmergency] = useState<(Emergency & { driver: Driver; vehicle: Vehicle; nearbyFacilities?: any[] }) | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(events.RECEIVE_EMERGENCY, (data) => {
      refetch();
      if (!activeEmergency) {
        setActiveEmergency(data);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [subscribe, events, refetch, activeEmergency]);

  const activeEmergencies = emergencies?.filter(e => e.status === "ACTIVE") || [];

  const mapMarkers = activeEmergencies.map(e => ({
    id: e.emergencyId,
    lat: parseFloat(String(e.latitude)),
    lng: parseFloat(String(e.longitude)),
    title: "EMERGENCY ALERT",
    type: "emergency" as const,
    details: `Driver: ${e.driver.name} | Vehicle: ${e.vehicle.vehicleNumber}`
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-red-600 text-white p-4 border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6" />
            <span className="text-xl font-bold">Hospital Control Room</span>
          </div>
          <Badge variant="outline" className="bg-white text-red-600">
            Read-Only Access
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Active Emergencies</span>
                <Badge variant="destructive">{activeEmergencies.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {activeEmergencies.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No active emergencies</p>
              ) : (
                activeEmergencies.map(emergency => (
                  <Card 
                    key={emergency.emergencyId} 
                    className="cursor-pointer hover:bg-red-50 border-red-200"
                    onClick={() => setActiveEmergency(emergency)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-red-700">Vehicle {emergency.vehicle.vehicleNumber}</p>
                          <p className="text-sm text-slate-600">Driver: {emergency.driver.name}</p>
                        </div>
                        <Badge variant="destructive">ACTIVE</Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(emergency.timestamp || emergency.createdAt || "").toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 h-[600px] rounded-lg overflow-hidden border">
            <Map 
              center={activeEmergencies[0] ? [parseFloat(String(activeEmergencies[0].latitude)), parseFloat(String(activeEmergencies[0].longitude))] : [40.7128, -74.0060]} 
              zoom={12} 
              markers={mapMarkers} 
            />
          </div>
        </div>

        {activeEmergency && (
          <Card className="border-2 border-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-6 h-6" />
                Emergency Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold mb-2">Driver Information</h4>
                    <p><strong>Name:</strong> {activeEmergency.driver.name}</p>
                    <p><strong>Driver Number:</strong> {activeEmergency.driverNumber}</p>
                    <p><strong>Phone:</strong> {activeEmergency.driver.phoneNumber}</p>
                    <p><strong>License:</strong> {activeEmergency.driver.licenseNumber}</p>
                  </div>
                  <div>
                    <h4 className="font-bold mb-2">Vehicle Information</h4>
                    <p><strong>Vehicle Number:</strong> {activeEmergency.vehicleNumber}</p>
                    <p><strong>Type:</strong> {activeEmergency.vehicle.vehicleType}</p>
                  </div>
                  <div>
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Location
                    </h4>
                    <p className="font-mono text-sm">
                      Lat: {parseFloat(String(activeEmergency.latitude)).toFixed(6)}<br />
                      Lng: {parseFloat(String(activeEmergency.longitude)).toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">
                      <strong>Time:</strong> {new Date(activeEmergency.timestamp || activeEmergency.createdAt || "").toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  {activeEmergency.videoUrl && (
                    <div className="bg-black rounded-lg overflow-hidden aspect-video">
                      <video 
                        src={activeEmergency.videoUrl.startsWith('http') ? activeEmergency.videoUrl : `${window.location.origin}${activeEmergency.videoUrl}`}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
