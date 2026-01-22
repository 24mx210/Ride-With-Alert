import { useEffect, useRef, useState } from "react";
import { AlertTriangle, MapPin, Video, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Emergency, type Vehicle, type Driver } from "@shared/schema";
import { useAcknowledgeEmergency } from "@/hooks/use-emergency";
import { useSocket } from "@/hooks/use-socket";

interface EmergencyAlertProps {
  emergency: (Emergency & { driver: Driver; vehicle: Vehicle }) | null;
  onClose: () => void;
}

interface AlarmState {
  interval?: NodeJS.Timeout;
  audioContext?: AudioContext;
}

export function EmergencyAlert({ emergency, onClose }: EmergencyAlertProps) {
  const alarmRef = useRef<AlarmState>({});
  const { mutate: acknowledge, isPending } = useAcknowledgeEmergency();
  const [isOpen, setIsOpen] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const { subscribe, events } = useSocket();

  useEffect(() => {
    if (emergency && emergency.status === "ACTIVE") {
      setIsOpen(true);
      setIsAlarmPlaying(true);
      // Play alarm sound - create a beeping alarm using Web Audio API
      const playAlarm = () => {
        if (!alarmRef.current.interval) {
          // Create a simple beeping alarm using Web Audio API
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          const beep = () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
          };
          
          beep();
          const beepInterval = setInterval(beep, 500);
          
          // Store interval ID and context for cleanup
          alarmRef.current.interval = beepInterval;
          alarmRef.current.audioContext = audioContext;
        }
      };
      
      playAlarm();
    } else if (emergency && emergency.status === "ACKNOWLEDGED") {
      // Close dialog immediately when acknowledged
      setIsOpen(false);
      setIsAlarmPlaying(false);
      // Stop alarm
      if (alarmRef.current.interval) {
        clearInterval(alarmRef.current.interval);
        alarmRef.current.interval = undefined;
      }
      if (alarmRef.current.audioContext) {
        alarmRef.current.audioContext.close().catch(() => {});
        alarmRef.current.audioContext = undefined;
      }
      // Close the dialog
      onClose();
    } else {
      setIsOpen(false);
      setIsAlarmPlaying(false);
      // Stop alarm
      if (alarmRef.current.interval) {
        clearInterval(alarmRef.current.interval);
        alarmRef.current.interval = undefined;
      }
      if (alarmRef.current.audioContext) {
        alarmRef.current.audioContext.close().catch(() => {});
        alarmRef.current.audioContext = undefined;
      }
    }

    return () => {
      if (alarmRef.current.interval) {
        clearInterval(alarmRef.current.interval);
        alarmRef.current.interval = undefined;
      }
      if (alarmRef.current.audioContext) {
        alarmRef.current.audioContext.close().catch(() => {});
        alarmRef.current.audioContext = undefined;
      }
    };
  }, [emergency, onClose]);

  useEffect(() => {
    const unsubscribe = subscribe(events.STOP_ALARM, (data) => {
      if (!data.emergencyId || data.emergencyId === emergency?.emergencyId) {
        setIsAlarmPlaying(false);
        setIsOpen(false);
        if (alarmRef.current.interval) {
          clearInterval(alarmRef.current.interval);
          alarmRef.current.interval = undefined;
        }
        if (alarmRef.current.audioContext) {
          alarmRef.current.audioContext.close().catch(() => {});
          alarmRef.current.audioContext = undefined;
        }
        // Close the dialog
        onClose();
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [subscribe, events, emergency, onClose]);

  const handleAcknowledge = () => {
    if (!emergency || isPending) return;
    
    // Stop alarm immediately
    setIsAlarmPlaying(false);
    if (alarmRef.current.interval) {
      clearInterval(alarmRef.current.interval);
      alarmRef.current.interval = undefined;
    }
    if (alarmRef.current.audioContext) {
      alarmRef.current.audioContext.close().catch(() => {});
      alarmRef.current.audioContext = undefined;
    }
    
    acknowledge(emergency.emergencyId, {
      onSuccess: (updatedEmergency) => {
        // Close immediately to prevent blinking
        setIsOpen(false);
        onClose();
      },
      onError: () => {
        // Keep dialog open on error so user can retry
        setIsAlarmPlaying(true);
      }
    });
  };

  const handleStopAlarmOnly = () => {
    setIsAlarmPlaying(false);
    if (alarmRef.current.interval) {
      clearInterval(alarmRef.current.interval);
      alarmRef.current.interval = undefined;
    }
    if (alarmRef.current.audioContext) {
      alarmRef.current.audioContext.close().catch(() => {});
      alarmRef.current.audioContext = undefined;
    }
  };

  if (!emergency) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`sm:max-w-2xl border-4 border-red-500 shadow-2xl shadow-red-500/50 bg-white ${emergency.status === "ACTIVE" ? "emergency-pulse" : ""}`}>
        <DialogHeader>
          <div className="flex items-center gap-4 text-red-600 mb-4">
            <AlertTriangle className="w-12 h-12 animate-bounce" />
            <div>
              <DialogTitle className="text-3xl font-black uppercase tracking-wider">
                Emergency Alert!
              </DialogTitle>
              <DialogDescription className="text-lg font-medium text-red-500">
                Immediate attention required for Vehicle {emergency.vehicle.vehicleNumber}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Location
              </h4>
              <p className="text-sm text-slate-600 font-mono">
                Lat: {parseFloat(String(emergency.latitude)).toFixed(6)}
                <br />
                Lng: {parseFloat(String(emergency.longitude)).toFixed(6)}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-700 mb-2">Driver Details</h4>
              <p className="text-lg font-semibold">{emergency.driver.name}</p>
              <p className="text-sm text-slate-500">Driver Number: {emergency.driverNumber}</p>
              <p className="text-sm text-slate-500">Phone: {emergency.driver.phoneNumber}</p>
              <p className="text-sm text-slate-500">License: {emergency.driver.licenseNumber}</p>
            </div>
            
            {(emergency as any).nearbyFacilities && (emergency as any).nearbyFacilities.length > 0 && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-700 mb-2">Nearby Facilities</h4>
                <div className="space-y-2">
                  {(emergency as any).nearbyFacilities.map((facility: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <p className="font-semibold">{facility.name} ({facility.type})</p>
                      <p className="text-slate-500">{facility.distance} km away</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-black rounded-xl overflow-hidden aspect-video relative flex items-center justify-center group">
            {emergency.videoUrl ? (
              <video 
                src={emergency.videoUrl.startsWith('http') ? emergency.videoUrl : `${window.location.origin}${emergency.videoUrl}`}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-white text-center">
                <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-red-500 animate-spin mx-auto mb-4" />
                <p>Waiting for video recording...</p>
              </div>
            )}
            
            {emergency.status === "ACTIVE" && (
              <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                LIVE
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-4">
          <Button 
            variant="outline" 
            onClick={handleStopAlarmOnly}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={!isAlarmPlaying}
          >
            {isAlarmPlaying ? "Mute Alarm Sound" : "Alarm Stopped"}
          </Button>
          <Button 
            size="lg" 
            variant="destructive" 
            className="w-full sm:w-auto text-lg font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all"
            onClick={handleAcknowledge}
            disabled={isPending || emergency.status === "ACKNOWLEDGED"}
          >
            {isPending ? "Processing..." : emergency.status === "ACKNOWLEDGED" ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Acknowledged
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Stop Alarm & Acknowledge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
