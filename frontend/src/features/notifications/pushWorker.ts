import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { firebaseConfig } from "./firebaseConfig";

declare const self: {
  skipWaiting: () => Promise<void>;
  addEventListener: (
    event: "install",
    handler: (event: { waitUntil: (promise: Promise<void>) => void }) => void,
  ) => void;
  registration: {
    showNotification: (
      title: string,
      options?: NotificationOptions,
    ) => Promise<void>;
  };
};

self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);

const messaging = getMessaging(initializeApp(firebaseConfig, "snsqb-push"));
onBackgroundMessage(messaging, (message) => {
  if (message.notification) return;
  return self.registration.showNotification("SNSQB", {
    body: "Bạn có thông báo mới.",
  });
});
