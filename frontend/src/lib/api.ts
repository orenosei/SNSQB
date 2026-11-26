import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { getSession, rotateTokens, setSession } from "../features/auth/session";
import type { RefreshTokenResponse, Tokens } from "../features/auth/types";

export interface ApiEnvelope<T> {
  code?: string;
  message?: string;
  data?: T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  // Swagger documents 0000; the deployed login response supplied by the user uses 1000.
  if (!["0000", "1000"].includes(response.data.code ?? "")) {
    throw new ApiError(
      response.data.message || "Yêu cầu chưa được thực hiện. Vui lòng thử lại.",
      response.data.code,
    );
  }
  return response.data.data as T;
}

export function requireTokens(data: RefreshTokenResponse | undefined): Tokens {
  if (typeof data?.access_token !== "string" || !data.access_token.trim()) {
    throw new ApiError(
      "Phản hồi xác thực thiếu token. Vui lòng đăng nhập lại.",
    );
  }
  return {
    access_token: data.access_token,
    refresh_token:
      typeof data.refresh_token === "string" && data.refresh_token.trim()
        ? data.refresh_token
        : null,
  };
}

const baseURL = (
  // Production HTTP requests use the same-origin proxy configured in vercel.json.
  import.meta.env.PROD
    ? "/api/v1"
    : import.meta.env.VITE_API_BASE_URL || "https://snsqb.duckdns.org/api/v1"
).replace(/\/+$/, "");
const options = {
  baseURL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
};
export const api = axios.create(options);
const refreshClient = axios.create(options);

// Only implemented non-Admin operations are allowed. Deny everything else before transport,
// including absolute URLs and any Admin operation; don't send JWTs to other hosts.
const allowed = new Set([
  "post /auth/login",
  "post /auth/logout",
  "get /users/me",
  "delete /users/me",
  "get /users/me/deletion",
  "delete /users/me/deletion",
  "get /games/check-in",
  "post /games/check-in",
  "get /games/leaderboard",
  "get /games/my-predictions",
  "get /games/prediction/game-1/classes",
  "post /games/prediction/participants",
  "post /games/prediction/approved-questions",
  "post /games/prediction/bank-size",
  "get /games/prediction/active-session",
  "post /games/prediction/submit",
  "post /devices/fid",
  "post /devices/fid/unregister",
  "get /badges",
  "get /badges/me",
  "get /cosmetics/shop",
  "get /cosmetics/my-inventory",
  "put /cosmetics/equip",
  "put /cosmetics/unequip",
  "get /conversations/group/invitations",
  "get /conversations/presence",
  "get /sessions/practice-catalog",
  "put /users/me",
  "get /activity-feeds",
  "post /posts",
  "get /posts/me",
  "get /comments",
  "post /comments",
  "post /react",
  "get /friendships",
  "post /friendships/request",
  "post /friendships/accept",
  "post /friendships/decline",
  "get /friendships/requests/received",
  "get /friendships/requests/sent",
  "get /follows/following",
  "get /follows/followers",
  "get /blocks",
  "get /search",
  "get /search/saved",
  "post /search/saved",
  "post /auth/email-verification/request",
  "post /auth/email-verification/confirm",
  "post /report/evidence",
  "get /conversations",
  "post /conversations/direct",
  "post /conversations/group",
  "get /conversations/group/candidates",
  "get /conversations/hidden",
  "post /conversations/hidden/unlock",
  "post /conversations/hidden/lock",
  "post /users/me/hidden-chat-pin",
  "get /notifications",
  "post /notifications/read-all",
  "post /report",
  "get /video-posts",
  "get /settings/push",
  "put /settings/push",
  "post /auth/change-password",
  "post /medias/upload",
  "get /subjects",
  "get /sessions/my-enrolled-course-classes",
  "get /sessions/my-submissions",
  "post /sessions/propose",
  "get /lecturer/sessions/reviewable",
  "post /lecturer/sessions/approve",
  "post /lecturer/sessions/reject",
  "get /lecturer/course-classes/my-classes",
  "post /lecturer/course-classes",
  "get /devices",
  "get /activity-feeds/new-count",
  "get /lecturer/questions/export",
  "get /lecturer/exams/my-exams",
  "post /lecturer/exams/generate",
]);
const resourceOperations = [
  /^post \/lecturer\/questions\/[1-9]\d*\/retry-duplicate-check$/,
  /^post \/questions\/[1-9]\d*\/ratings\/[1-9]\d*\/review-error$/,
  /^(get|put|delete) \/lecturer\/medias\/lecture-uploads\/[a-f0-9-]{36}$/,
  /^post \/lecturer\/medias\/lecture-uploads\/[a-f0-9-]{36}\/(complete|parts\/[1-9]\d*)$/,
  /^put \/conversations\/[1-9]\d*$/,
  /^(get|post) \/conversations\/[1-9]\d*\/members$/,
  /^post \/conversations\/[1-9]\d*\/leave$/,
  /^delete \/conversations\/[1-9]\d*\/members\/[1-9]\d*$/,
  /^put \/conversations\/[1-9]\d*\/members\/[1-9]\d*\/role$/,
  /^patch \/conversations\/[1-9]\d*\/(hide|unhide)$/,
  /^get \/lecturer\/sessions\/[1-9]\d*(\/questions\/[1-9]\d*\/duplicate-matches)?$/,
  /^get \/lecturer\/exams\/question-bank\/[1-9]\d*\/summary$/,
  /^delete \/friendships\/requests\/sent\/[1-9]\d*$/,
  /^put \/questions\/[1-9]\d*\/report$/,
  /^post \/questions\/[1-9]\d*\/ai-(refine|apply)$/,
  /^(get|post) \/lecturer\/subjects\/[1-9]\d*\/topics$/,
  /^put \/lecturer\/subjects\/[1-9]\d*\/topics\/[1-9]\d*$/,
  /^get \/badges\/(users\/)?[1-9]\d*$/,
  /^get \/subjects\/[1-9]\d*\/topics$/,
  /^post \/cosmetics\/[1-9]\d*\/buy$/,
  /^post \/conversations\/group\/invitations\/[1-9]\d*\/accept$/,
  /^delete \/conversations\/group\/invitations\/[1-9]\d*$/,
  /^(get|put|delete) \/posts\/[1-9]\d*$/,
  /^(put|delete) \/comments\/[1-9]\d*$/,
  /^get \/users\/[1-9]\d*(\/posts|\/relationship-stats)?$/,
  /^get \/users\/[1-9]\d*\/sessions$/,
  /^put \/posts\/[1-9]\d*\/lecturer-notes$/,
  /^get \/lecturer\/course-classes\/[1-9]\d*(\/students)?$/,
  /^post \/lecturer\/course-classes\/[1-9]\d*\/students$/,
  /^post \/devices\/[A-Za-z0-9_%~.!*'()-]+\/logout$/,
  /^delete \/devices\/[A-Za-z0-9_%~.!*'()-]+$/,
  /^delete \/friendships\/[1-9]\d*$/,
  /^(post|delete) \/(follows|blocks)\/[1-9]\d*$/,
  /^(get|put|delete) \/sessions\/my-submissions\/[1-9]\d*$/,
  /^get \/sessions\/[1-9]\d*\/questions$/,
  /^post \/lecturer\/sessions\/[1-9]\d*\/complete-review$/,
  /^put \/lecturer\/questions\/[1-9]\d*$/,
  /^get \/questions\/[1-9]\d*\/(statistics|ratings)$/,
  /^post \/questions\/[1-9]\d*\/(answer|rate)$/,
  /^get \/lecturer\/exams\/[1-9]\d*(\/export)?$/,
  /^get \/conversations\/[1-9]\d*\/messages$/,
  /^delete \/messages\/[1-9]\d*$/,
  /^post \/notifications\/[1-9]\d*\/read$/,
  /^delete \/search\/saved\/[1-9]\d*$/,
];
type RetryConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
  _sessionRevision?: number;
};
api.interceptors.request.use((config) => {
  const operation = `${config.method?.toLowerCase()} ${config.url}`;
  if (
    !(
      allowed.has(operation) ||
      resourceOperations.some((pattern) => pattern.test(operation))
    ) ||
    config.baseURL !== baseURL
  ) {
    throw new ApiError("API này chưa được hỗ trợ trong phiên bản hiện tại.");
  }
  const request = config as RetryConfig;
  if (
    request._sessionRevision !== undefined &&
    request._sessionRevision !== getSession().revision
  ) {
    throw new ApiError("Phiên đăng nhập đã thay đổi. Vui lòng thử lại.");
  }
  request._sessionRevision = getSession().revision;
  config.headers.delete("Authorization");
  const tokens = getSession().tokens;
  if (tokens && config.url !== "/auth/login")
    config.headers.set("Authorization", `Bearer ${tokens.access_token}`);
  return config;
});

let refreshFlight: { session: Tokens; promise: Promise<Tokens> } | null = null;
async function refreshSession(session: Tokens): Promise<Tokens> {
  if (refreshFlight?.session === session) return refreshFlight.promise;
  const promise = (async () => {
    try {
      const response = await refreshClient.post<
        ApiEnvelope<RefreshTokenResponse>
      >("/auth/refresh", {
        refresh_token: session.refresh_token,
      });
      const tokens = requireTokens(unwrap(response));
      // Logout or a new login may have happened while refresh was in flight.
      if (getSession().tokens !== session)
        throw new ApiError("Phiên đăng nhập đã thay đổi.");
      rotateTokens(tokens);
      return tokens;
    } catch (error) {
      if (getSession().tokens === session)
        setSession(null, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      throw error;
    }
  })();
  refreshFlight = { session, promise };
  try {
    return await promise;
  } finally {
    if (refreshFlight?.promise === promise) refreshFlight = null;
  }
}

api.interceptors.response.use(
  (response) => {
    const config = response.config as RetryConfig;
    if (
      config.url !== "/auth/login" &&
      config._sessionRevision !== getSession().revision
    ) {
      throw new ApiError(
        "Phiên đăng nhập đã thay đổi. Phản hồi của phiên cũ đã được bỏ qua.",
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const session = getSession().tokens;
    if (
      error.response?.status !== 401 ||
      !config ||
      config.url === "/auth/login" ||
      !session ||
      config._sessionRevision !== getSession().revision
    )
      throw error;
    if (config._retried) {
      if (
        config.headers.get("Authorization") === `Bearer ${session.access_token}`
      ) {
        setSession(
          null,
          "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.",
        );
      }
      throw error;
    }
    config._retried = true;
    // A concurrent request may already have refreshed this access token.
    if (
      config.headers.get("Authorization") === `Bearer ${session.access_token}`
    ) {
      if (!session.refresh_token) {
        setSession(null, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        throw error;
      }
      await refreshSession(session);
    }
    if (!getSession().tokens) throw error;
    return api(config);
  },
);

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return "Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.";
    if (error.response.status === 400)
      return "Thông tin không hợp lệ. Vui lòng kiểm tra lại.";
    if (error.response.status === 401)
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.response.status === 403)
      return "Tài khoản chưa được kích hoạt, bị khóa hoặc không có quyền truy cập. Nội dung cũng có thể bị giới hạn quyền riêng tư hoặc chặn.";
    if (error.response.status === 404)
      return "Nội dung không còn tồn tại hoặc không thể truy cập.";
    if (error.response.status === 409)
      return "Trạng thái đã thay đổi hoặc yêu cầu đang chờ xử lý. Hãy tải lại dữ liệu trước khi thử lại.";
    if (error.response.status === 413)
      return "Máy chủ từ chối tệp vì kích thước quá lớn. Hãy chọn tệp nhỏ hơn.";
    if (error.response.status === 412)
      return "Câu hỏi đã thay đổi từ khi bạn mở trang. Hãy tải lại câu hỏi và chọn đáp án lại trước khi gửi.";
    if (error.response.status === 429)
      return "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";
  }
  return "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
}
