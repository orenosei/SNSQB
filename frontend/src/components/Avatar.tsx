import { useState } from "react";

export function imageUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function Avatar({
  name,
  url,
  large = false,
  frame,
}: {
  name?: string;
  url?: string;
  large?: boolean;
  frame?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const src = imageUrl(url);
  const frameSrc = imageUrl(frame);
  const [failedFrame, setFailedFrame] = useState<string>();
  const initials = (name || "Bạn")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi");
  return (
    <span
      className={`avatar ${large ? "avatar-large" : ""}`}
      aria-hidden="true"
    >
      {src && failedUrl !== src ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(src)}
        />
      ) : (
        initials
      )}
      {frameSrc && failedFrame !== frameSrc && (
        <img className="avatar-frame" src={frameSrc} alt="" referrerPolicy="no-referrer" onError={() => setFailedFrame(frameSrc)} />
      )}
    </span>
  );
}
