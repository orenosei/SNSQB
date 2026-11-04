import { validId } from "./cursor";

/** Only destinations implemented by this frontend may be followed from API data. */
export function supportedDestination(value?: string): string | undefined {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(value)
  )
    return;
  try {
    const url = new URL(value, "https://snsqb.invalid");
    if (url.origin !== "https://snsqb.invalid") return;
    if (
      /^\/(?:$|me$|friends$|my-posts$|search$|question-bank$|videos$|chat$|notifications$|settings\/(?:profile|password|notifications|devices)$|posts\/(?:new|[1-9]\d*(?:\/edit)?)$|users\/[1-9]\d*$|submissions(?:\/(?:new|[1-9]\d*(?:\/edit)?))?$|practice\/[1-9]\d*$|lecturer\/(?:reviews|exams|course-classes)(?:\/(?:new|[1-9]\d*))?$)/.test(
        url.pathname,
      )
    )
      return url.pathname + url.search + url.hash;
  } catch {
    /* Unsupported destination. */
  }
}

export function notificationDestination(target?: {
  type?: string;
  target_id?: number;
  url?: string;
}) {
  if (!target) return;
  const explicit = supportedDestination(target.url);
  if (explicit) return explicit;
  if (!validId(target.target_id)) return;
  switch (target.type) {
    case "POST":
      return `/posts/${target.target_id}`;
    case "USER":
      return `/users/${target.target_id}`;
    case "SESSION":
      return `/practice/${target.target_id}`;
    case "CONVERSATION":
      return `/chat?id=${target.target_id}`;
    // QUESTION has no standalone GET; BADGE has no approved destination yet.
    default:
      return;
  }
}
