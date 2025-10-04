import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const instance = io('/', { path: '/socket.io', withCredentials: true });
    setSocket(instance);
    return () => {
      instance.disconnect();
    };
  }, []);

  const value = useMemo(() => socket, [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export function useSocket() {
  return useContext(SocketContext);
}
