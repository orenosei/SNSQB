import { getApps, initializeApp } from "firebase/app";
import {
  getMessaging,
  isSupported,
  onMessage,
  onRegistered,
  register,
  unregister,
} from "firebase/messaging";
import { api, ApiError, type ApiEnvelope, unwrap } from "../../lib/api";
import { getSession } from "../auth/session";
import { firebaseConfig, pushConfigured, vapidKey } from "./firebaseConfig";
import workerUrl from "./pushWorker?worker&url";

function messagingClient() {
  const app =
    getApps().find((item) => item.name === "snsqb-push") ||
    initializeApp(firebaseConfig, "snsqb-push");
  return getMessaging(app);
}

async function waitForActivation(registration: ServiceWorkerRegistration) {
  if (registration.active?.state === "activated") return registration;
  const worker =
    registration.installing || registration.waiting || registration.active;
  if (!worker)
    throw new ApiError("Trình duyệt chưa khởi tạo được bộ nhận thông báo.");
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        finish(new ApiError("Bộ nhận thông báo chưa khởi động. Hãy thử lại.")),
      12000,
    );
    function finish(error?: Error) {
      clearTimeout(timeout);
      worker?.removeEventListener("statechange", changed);
      if (error) reject(error);
      else resolve();
    }
    function changed() {
      if (worker?.state === "activated") finish();
      if (worker?.state === "redundant")
        finish(new ApiError("Bộ nhận thông báo không thể khởi động."));
    }
    worker.addEventListener("statechange", changed);
    changed();
  });
  return registration;
}

export async function enableWebPush() {
  if (
    !pushConfigured ||
    !("Notification" in window) ||
    !("serviceWorker" in navigator)
  ) {
    throw new ApiError("Thông báo đẩy chưa khả dụng trên trình duyệt này.");
  }
  const revision = getSession().revision;
  if ((await Notification.requestPermission()) !== "granted") {
    throw new ApiError("Bạn cần cho phép thông báo trong cài đặt trình duyệt.");
  }
  if (!(await isSupported()))
    throw new ApiError("Trình duyệt này chưa hỗ trợ Firebase Messaging.");
  const messaging = messagingClient();
  const serviceWorkerRegistration = await waitForActivation(
    await navigator.serviceWorker.register(workerUrl, {
      type: import.meta.env.DEV ? "module" : "classic",
    }),
  );
  const fid = await new Promise<string>((resolve, reject) => {
    const unsubscribe = onRegistered(messaging, (installationId) => {
      cleanup();
      resolve(installationId);
    });
    const timer = setTimeout(() => {
      cleanup();
      reject(new ApiError("Firebase chưa trả về mã thiết bị. Hãy thử lại."));
    }, 15000);
    function cleanup() {
      clearTimeout(timer);
      unsubscribe();
    }
    void register(messaging, { vapidKey, serviceWorkerRegistration }).catch(
      (cause) => {
        cleanup();
        reject(cause);
      },
    );
  });
  if (getSession().revision !== revision)
    throw new ApiError("Phiên đăng nhập đã thay đổi.");
  unwrap(await api.post<ApiEnvelope<unknown>>("/devices/fid", { fid }));
  return fid;
}

export async function disableWebPush(fid: string) {
  unwrap(
    await api.post<ApiEnvelope<unknown>>("/devices/fid/unregister", { fid }),
  );
  await unregister(messagingClient());
}

export async function watchWebPush(onNotification: () => void) {
  if (!pushConfigured || !(await isSupported())) return undefined;
  return onMessage(messagingClient(), onNotification);
}
