import { Client, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getSession } from "../auth/session";

export interface ChatEvent {
  conversation_id?: number;
  message_id?: number;
  sender_id?: number;
  content?: string;
  is_typing?: boolean;
  typing?: boolean;
}
export function connectChat(
  onEvent: (event: ChatEvent) => void,
  onStatus: (connected: boolean) => void,
) {
  const url =
    (
      import.meta.env.VITE_API_BASE_URL || "https://snsqb.duckdns.org/api/v1"
    ).replace(/\/+$/, "") + "/ws";
  let typingSubscription: StompSubscription | undefined;
  const client = new Client({
    webSocketFactory: () => new SockJS(url),
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    beforeConnect: () => {
      const token = getSession().tokens?.access_token;
      client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    },
    onConnect: () => {
      onStatus(true);
      client.subscribe("/user/queue/messages", (frame) => {
        try {
          onEvent(JSON.parse(frame.body) as ChatEvent);
        } catch {
          /* Ignore malformed events. */
        }
      });
    },
    onWebSocketClose: () => onStatus(false),
    onWebSocketError: () => onStatus(false),
    onStompError: () => onStatus(false),
  });
  client.activate();
  return {
    client,
    subscribeTyping(id: number, onTyping: (event: ChatEvent) => void) {
      if (client.connected) typingSubscription?.unsubscribe();
      typingSubscription = undefined;
      if (client.connected)
        typingSubscription = client.subscribe(
          `/topic/conv.${id}.typing`,
          (frame) => {
            try {
              onTyping(JSON.parse(frame.body) as ChatEvent);
            } catch {
              /* Ignore malformed events. */
            }
          },
        );
      const subscription = typingSubscription;
      return () => {
        if (subscription) {
          if (client.connected) subscription.unsubscribe();
          if (typingSubscription === subscription)
            typingSubscription = undefined;
        }
      };
    },
    send(destination: string, body: object) {
      if (!client.connected) return false;
      try {
        client.publish({ destination, body: JSON.stringify(body) });
        return true;
      } catch {
        return false;
      }
    },
    close() {
      if (client.connected) typingSubscription?.unsubscribe();
      void client.deactivate();
    },
  };
}
