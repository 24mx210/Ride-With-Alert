import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket as useSocketHook } from "@/hooks/use-socket";
import { useTriggerEmergency } from "@/hooks/use-emergency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Video, AlertTriangle, LogOut, Fuel, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactWebcam from "react-webcam";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Map } from "@/components/Map";

export default function DriverDashboard() {
  const { logout } = useAuth();
  const { socket, emit, events } = useSocketHook();
  const { toast } = useToast();
  const { mutate: triggerEmergency, isPending: isTriggering } = useTriggerEmergency();

  // State
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Monitoring Active");
  
  // Refs
  const webcamRef = useRef<ReactWebcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Fetch current driver info to get assigned vehicle
  const { data: driver } = useQuery({
    queryKey: ["/api/driver/me"], // Assuming we had this endpoint or stored in context, otherwise simplified:
    queryFn: async () => {
      // For this demo, we assume the user context would have this, but let's mock fetching "me"
      // In a real app we'd have a /me endpoint. We'll use local storage mock or similar if needed.
      // But since we need vehicle ID for socket events, let's assume we got it from login response stored in context/local storage
      // For simplicity in this generator, I'll mock getting vehicle details
      return { id: 1, name: "John Doe", vehicleId: 1 }; 
    }
  });

  // Get GPS Location
  useEffect(() => {
    if (!navigator.geolocation) {
      toast({ title: "Error", description: "Geolocation not supported", variant: "destructive" });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(newLoc);
        
        // Emit location update to server
        if (driver?.vehicleId) {
          emit(events.LOCATION_UPDATE, {
            vehicleId: driver.vehicleId,
            location: newLoc
          });
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driver, emit, events, toast]);

  // Handle Recording
  const handleDataAvailable = ({ data }: BlobEvent) => {
    if (data.size > 0) {
      setRecordedChunks((prev) => [...prev, data]);
    }
  };

  const startRecording = () => {
    setRecordedChunks([]);
    if (webcamRef.current && webcamRef.current.stream) {
      mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, {
        mimeType: "video/webm"
      });
      mediaRecorderRef.current.addEventListener(
        "dataavailable",
        handleDataAvailable
      );
      mediaRecorderRef.current.start();
      setTimeout(stopRecording, 5000); // Record for 5 seconds
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  // Upload video when chunks are ready
  useEffect(() => {
    if (recordedChunks.length > 0 && isEmergencyActive) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const formData = new FormData();
      formData.append("video", blob, "emergency-capture.webm");
      if (driver?.vehicleId && location) {
        formData.append("vehicleId", driver.vehicleId.toString());
        formData.append("driverId", driver.id.toString());
        formData.append("latitude", location.lat.toString());
        formData.append("longitude", location.lng.toString());
        
        triggerEmergency(formData, {
          onSuccess: () => {
             setStatusMessage("ALERT SENT! Help is on the way.");
             emit(events.EMERGENCY_TRIGGERED, {
               vehicleId: driver.vehicleId,
               location: location,
               driverId: driver.id
             });
          }
        });
      }
    }
  }, [recordedChunks, isEmergencyActive, driver, location, triggerEmergency, emit, events]);

  const handleEmergencyClick = () => {
    if (!location) {
      toast({ title: "Waiting for GPS", description: "Cannot send alert without location.", variant: "destructive" });
      return;
    }
    setIsEmergencyActive(true);
    setStatusMessage("Recording Incident...");
    startRecording();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans">
      <header className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold tracking-tight font-display">RideWithAlert</h1>
          <p className="text-xs text-slate-400">Driver Console</p>
        </div>
        <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => logout()}>
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      <main className="flex-grow p-4 space-y-4">
        {/* Status Bar */}
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg transition-colors duration-500 ${isEmergencyActive ? 'bg-red-900/50 border-red-500 animate-pulse' : 'bg-slate-800 border-slate-700'}`}>
          <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${isEmergencyActive ? 'bg-red-500' : 'bg-green-500'}`} />
             <span className="font-bold text-lg">{statusMessage}</span>
          </div>
          {location && (
            <Badge variant="outline" className="border-slate-500 text-slate-300 font-mono">
              <Navigation className="w-3 h-3 mr-1" />
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </Badge>
          )}
        </div>

        {/* Camera Preview */}
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-700 shadow-2xl">
           <ReactWebcam
             audio={true} // In real app, might want audio muted on local preview to prevent feedback
             ref={webcamRef}
             screenshotFormat="image/jpeg"
             className="w-full h-full object-cover"
             muted={true}
           />
           <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs flex items-center gap-2">
             <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> REC READY
           </div>
        </div>

        {/* Map Preview */}
        <div className="h-48 rounded-xl overflow-hidden border border-slate-700">
           {location ? (
             <Map center={[location.lat, location.lng]} zoom={15} markers={[{
               id: 1, lat: location.lat, lng: location.lng, title: "My Location", type: "vehicle"
             }]} />
           ) : (
             <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
               <MapPin className="w-6 h-6 mr-2 animate-bounce" /> Acquiring GPS...
             </div>
           )}
        </div>

        {/* SOS Button */}
        <Button 
          onClick={handleEmergencyClick}
          disabled={isTriggering || isEmergencyActive}
          className={`w-full h-32 text-3xl font-black tracking-widest rounded-2xl shadow-xl transition-all duration-200 transform active:scale-95 ${
            isEmergencyActive 
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
            : 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/50 hover:shadow-red-900/70 border-b-8 border-red-800 active:border-b-0 active:translate-y-2'
          }`}
        >
          {isTriggering ? (
            "SENDING..." 
          ) : isEmergencyActive ? (
            "HELP REQUESTED" 
          ) : (
            <span className="flex items-center justify-center gap-3">
              <AlertTriangle className="w-10 h-10" /> SOS
            </span>
          )}
        </Button>

        {/* Maintenance Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-16 bg-slate-800 border-slate-700" onClick={() => toast({ title: "Fuel Log", description: "Opening fuel log form..." })}>
            <Fuel className="w-5 h-5 mr-2 text-blue-400" /> Log Fuel
          </Button>
          <Button variant="outline" className="h-16 bg-slate-800 border-slate-700" onClick={() => toast({ title: "Service Log", description: "Opening service log form..." })}>
            <Wrench className="w-5 h-5 mr-2 text-orange-400" /> Log Service
          </Button>
        </div>
        
        <p className="text-center text-xs text-slate-500 uppercase tracking-widest">
          Press only in case of genuine emergency
        </p>
      </main>
    </div>
  );
}
