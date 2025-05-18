import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

type WebSocketContextType = {
  socket: Socket | null;
  connected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

type WebSocketProviderProps = {
  children: React.ReactNode;
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [socket, setSocket] = useState<Socket | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    // const token = localStorage.getItem('accessToken');
    // if (!token) {
    //   return;
    // }
    // const socketInstance = io(`${import.meta.env.VITE_SERVER_URL}/tasks`, {
    //   auth: {
    //     token,
    //   },
    //   transports: ['websocket'],
    //   autoConnect: true,
    // });
    // socketInstance.on('connect', () => {
    //   setConnected(true);
    // });
    // socketInstance.on('disconnect', () => {
    //   setConnected(false);
    // });
    // socketInstance.on('connect_error', (error) => {
    //   setConnected(false);
    // });
    // setSocket(socketInstance);
    // return () => {
    //   socketInstance.disconnect();
    // };
  }, []);

  return (
    <WebSocketContext.Provider value={{ socket, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
