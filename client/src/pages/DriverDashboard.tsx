import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket as useSocketHook } from "@/hooks/use-socket";
import { useTriggerEmergency } from "@/hooks/use-emergency";
import { useCurrentTrip } from "@/hooks/use-fleet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Video, AlertTriangle, LogOut, Fuel, Wrench, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactWebcam from "react-webcam";
import { Map } from "@/components/Map";

export default function DriverDashboard() {
  const { logout } = useAuth();
  const { socket, emit, subscribe, events } = useSocketHook();
  const { toast } = useToast();
  const { mutate: triggerEmergency, isPending: isTriggering } = useTriggerEmergency();

  // State
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Monitoring Active");
  const [acknowledgmentMessage, setAcknowledgmentMessage] = useState<string | null>(null);
  const [isProcessingEmergency, setIsProcessingEmergency] = useState(false);
  
  // Refs
  const webcamRef = useRef<ReactWebcam>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Fetch current trip info
  const { data: trip } = useCurrentTrip();

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
        if (trip?.vehicleNumber) {
          emit(events.LOCATION_UPDATE, {
            vehicleNumber: trip.vehicleNumber,
            location: newLoc
          });
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [trip, emit, events, toast]);

  // Handle Recording
  const handleDataAvailable = ({ data }: BlobEvent) => {
    if (data.size > 0) {
      setRecordedChunks((prev) => [...prev, data]);
    }
  };

  const startRecording = () => {
    setRecordedChunks([]);
    if (webcamRef.current && webcamRef.current.stream) {
      const options: MediaRecorderOptions = {
        mimeType: "video/webm;codecs=vp8,opus"
      };
      
      // Fallback to default if codec not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = "video/webm";
      }
      
      mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, options);
      mediaRecorderRef.current.addEventListener(
        "dataavailable",
        handleDataAvailable
      );
      mediaRecorderRef.current.start(1000); // Collect data every second
      setTimeout(stopRecording, 45000); // Record for 45 seconds (30-60 range)
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  // Upload video when chunks are ready
  useEffect(() => {
    if (recordedChunks.length > 0 && isEmergencyActive && mediaRecorderRef.current?.state === "inactive") {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const formData = new FormData();
      formData.append("video", blob, "emergency-capture.webm");
      if (trip?.vehicleNumber && trip?.driverNumber && location) {
        formData.append("vehicleNumber", trip.vehicleNumber);
        formData.append("driverNumber", trip.driverNumber);
        formData.append("location", JSON.stringify({ latitude: location.lat, longitude: location.lng }));
        
        triggerEmergency(formData, {
          onSuccess: () => {
             setStatusMessage("ALERT SENT! Help is on the way.");
             setIsProcessingEmergency(false);
             emit(events.EMERGENCY_TRIGGERED, {
               vehicleNumber: trip.vehicleNumber,
               driverNumber: trip.driverNumber,
               location: location
             });
          },
          onError: () => {
            setIsProcessingEmergency(false);
            setIsEmergencyActive(false);
            setStatusMessage("Monitoring Active");
          }
        });
      }
    }
  }, [recordedChunks, isEmergencyActive, trip, location, triggerEmergency, emit, events]);

  // Listen for acknowledgment
  useEffect(() => {
    const unsubscribe = subscribe(events.RECEIVE_ACKNOWLEDGEMENT, (data) => {
      setAcknowledgmentMessage(data.message || "Emergency acknowledged by manager");
      setIsEmergencyActive(false);
      setIsProcessingEmergency(false);
      setStatusMessage("Emergency acknowledged by manager");
    });

    const unsubscribeStopAlarm = subscribe(events.STOP_ALARM, () => {
      // Alarm stopped, but don't change emergency state
    });

    return () => {
      unsubscribe?.();
      unsubscribeStopAlarm?.();
    };
  }, [subscribe, events]);

  // Request camera and location permissions on first load
  useEffect(() => {
    if (trip && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(() => {
          console.log("Camera and microphone access granted");
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          toast({ title: "Camera Access", description: "Please grant camera permissions for emergency recording", variant: "destructive" });
        });
    }
  }, [trip, toast]);

  const handleEmergencyClick = () => {
    if (!location) {
      toast({ title: "Waiting for GPS", description: "Cannot send alert without location.", variant: "destructive" });
      return;
    }
    
    // Prevent multiple rapid clicks
    if (isProcessingEmergency || isEmergencyActive) {
      toast({ title: "Emergency in progress", description: "Please wait for current emergency to process.", variant: "destructive" });
      return;
    }
    
    setIsProcessingEmergency(true);
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
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg transition-colors duration-500 ${isEmergencyActive ? 'bg-red-900/50 border-red-500 animate-pulse' : acknowledgmentMessage ? 'bg-green-900/50 border-green-500' : 'bg-slate-800 border-slate-700'}`}>
          <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${isEmergencyActive ? 'bg-red-500' : acknowledgmentMessage ? 'bg-green-500' : 'bg-green-500'}`} />
             <span className="font-bold text-lg">{statusMessage}</span>
             {acknowledgmentMessage && (
               <CheckCircle className="w-5 h-5 text-green-400" />
             )}
          </div>
          {location && (
            <Badge variant="outline" className="border-slate-500 text-slate-300 font-mono">
              <Navigation className="w-3 h-3 mr-1" />
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </Badge>
          )}
        </div>

        {/* Trip Info Card */}
        {trip && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Active Trip</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-400">Driver</p>
                  <p className="text-lg font-bold text-white">{trip.driver.name} ({trip.driverNumber})</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Vehicle</p>
                  <p className="text-xl font-bold text-white">{trip.vehicle.vehicleNumber}</p>
                  <p className="text-sm text-slate-400">{trip.vehicle.vehicleType}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                  <div>
                    <p className="text-sm text-slate-400">Fuel Level</p>
                    <p className="text-2xl font-bold text-white">{trip.vehicle.currentFuel}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Estimated Range</p>
                    <p className="text-lg font-bold text-white">
                      ~{Math.round((trip.vehicle.currentFuel / 100) * trip.vehicle.fuelCapacity * 10)} km
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
          disabled={isTriggering || isEmergencyActive || isProcessingEmergency}
          className={`w-full h-32 text-3xl font-black tracking-widest rounded-2xl shadow-xl transition-all duration-200 transform active:scale-95 ${
            isEmergencyActive || isProcessingEmergency
            ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
            : 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/50 hover:shadow-red-900/70 border-b-8 border-red-800 active:border-b-0 active:translate-y-2'
          }`}
        >
          {isTriggering || isProcessingEmergency ? (
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
