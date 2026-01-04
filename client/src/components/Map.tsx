import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { type Emergency, type Vehicle, type Driver } from "@shared/schema";

// Fix for default Leaflet marker icons not loading in React
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const emergencyIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const vehicleIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    id: number;
    lat: number;
    lng: number;
    title: string;
    type: "vehicle" | "emergency";
    details?: any;
  }>;
  className?: string;
}

export function Map({ center, zoom = 13, markers = [], className = "h-full w-full rounded-xl" }: MapProps) {
  // Center map when center prop changes
  const Recenter = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = L.map('map', { center: [lat, lng], zoom }); // This won't work directly inside component due to context
    return null;
  };

  return (
    <div className={className}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%", borderRadius: "inherit" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker) => (
          <Marker 
            key={`${marker.type}-${marker.id}`} 
            position={[marker.lat, marker.lng]}
            icon={marker.type === "emergency" ? emergencyIcon : vehicleIcon}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-lg mb-1">{marker.title}</h3>
                {marker.details && (
                  <div className="text-sm text-gray-600">
                    {marker.type === "emergency" && (
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold mb-2">
                        ACTIVE EMERGENCY
                      </span>
                    )}
                    <p>{marker.details}</p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
