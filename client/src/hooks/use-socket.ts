import { useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { socketEvents } from "@shared/routes";

// Assuming socket connects to the same host
const SOCKET_URL = window.location.origin;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket"], // Force websocket for better performance
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected:", socketRef.current?.id);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const emit = (event: string, data: any) => {
    socketRef.current?.emit(event, data);
  };

  const subscribe = (event: string, callback: (data: any) => void) => {
    const socket = socketRef.current;
    if (!socket) return;
    
    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  };

  return { socket: socketRef.current, emit, subscribe, events: socketEvents };
}
