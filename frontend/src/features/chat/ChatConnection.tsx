import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectChat } from "./realtime";
import { useLocation } from "react-router";
import { useSession } from "../auth/session";

type Connection = ReturnType<typeof connectChat>;
const ChatContext = createContext<{
  connection: Connection | null;
  connected: boolean;
}>({ connection: null, connected: false });

export function ChatConnectionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const location = useLocation();
  const { tokens } = useSession();
  const [started, setStarted] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (location.pathname === "/chat") setStarted(true);
  }, [location.pathname]);
  useEffect(() => {
    if (!started || !tokens?.access_token) return;
    setConnected(false);
    const refresh = () => {
      void client.invalidateQueries({ queryKey: ["conversations"] });
      void client.invalidateQueries({ queryKey: ["chat-messages"] });
    };
    const socket = connectChat(refresh, (status) => {
      setConnected(status);
      if (status) refresh();
    });
    setConnection(socket);
    return () => {
      socket.close();
    };
  }, [client, started, tokens?.access_token]);
  return (
    <ChatContext.Provider value={{ connection, connected }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChatConnection = () => useContext(ChatContext);
