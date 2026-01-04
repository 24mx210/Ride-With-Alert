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

interface EmergencyAlertProps {
  emergency: (Emergency & { driver: Driver; vehicle: Vehicle }) | null;
  onClose: () => void;
}

export function EmergencyAlert({ emergency, onClose }: EmergencyAlertProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { mutate: acknowledge, isPending } = useAcknowledgeEmergency();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (emergency) {
      setIsOpen(true);
      // Play alarm sound
      if (!audioRef.current) {
        audioRef.current = new Audio("https://cdn.freesound.org/previews/250/250711_4486188-lq.mp3");
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    } else {
      setIsOpen(false);
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }

    return () => {
      audioRef.current?.pause();
    };
  }, [emergency]);

  const handleAcknowledge = () => {
    if (!emergency) return;
    acknowledge(emergency.id, {
      onSuccess: () => {
        audioRef.current?.pause();
        onClose();
      }
    });
  };

  const handleStopAlarmOnly = () => {
    audioRef.current?.pause();
  };

  if (!emergency) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl border-4 border-red-500 shadow-2xl shadow-red-500/50 emergency-pulse bg-white">
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
                Lat: {emergency.location.latitude.toFixed(6)}
                <br />
                Lng: {emergency.location.longitude.toFixed(6)}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-700 mb-2">Driver Details</h4>
              <p className="text-lg font-semibold">{emergency.driver.name}</p>
              <p className="text-sm text-slate-500">Phone: {emergency.driver.phone}</p>
              <p className="text-sm text-slate-500">License: {emergency.driver.licenseNumber}</p>
            </div>
          </div>

          <div className="bg-black rounded-xl overflow-hidden aspect-video relative flex items-center justify-center group">
            {emergency.videoUrl ? (
               // In a real app, this would be a video player
              <div className="text-white text-center">
                 <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                 <p className="text-sm text-slate-400">Video Feed Available</p>
                 <a href={emergency.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mt-2 inline-block">View Recording</a>
              </div>
            ) : (
              <div className="text-white text-center">
                <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-red-500 animate-spin mx-auto mb-4" />
                <p>Waiting for live feed...</p>
              </div>
            )}
            
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
              LIVE
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-4">
          <Button 
            variant="outline" 
            onClick={handleStopAlarmOnly}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Mute Alarm Sound
          </Button>
          <Button 
            size="lg" 
            variant="destructive" 
            className="w-full sm:w-auto text-lg font-bold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all"
            onClick={handleAcknowledge}
            disabled={isPending}
          >
            {isPending ? "Processing..." : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Acknowledge Emergency
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
