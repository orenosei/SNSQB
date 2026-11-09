const BACKEND = "https://snsqb.duckdns.org/api/v1";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const path = Array.isArray(req.query?.path)
    ? req.query.path.join("/")
    : String(req.query?.path ?? "");
  const query = typeof req.url === "string" && req.url.includes("?")
    ? req.url.slice(req.url.indexOf("?"))
    : "";
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers ?? {})) {
    const lower = name.toLowerCase();
    if (
      lower === "origin" ||
      lower === "host" ||
      lower === "content-length" ||
      lower.startsWith("x-forwarded-")
    ) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : String(value));
  }

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const body = hasBody
    ? typeof req.body === "string"
      ? req.body
      : req.body == null
        ? undefined
        : JSON.stringify(req.body)
    : undefined;

  try {
    const response = await fetch(`${BACKEND}/${path}${query}`, {
      method: req.method,
      headers,
      body,
    });

    res.status(response.status);
    response.headers.forEach((value, name) => {
      if (!["content-encoding", "content-length", "transfer-encoding"].includes(name))
        res.setHeader(name, value);
    });
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.status(502).json({ code: "BAD_GATEWAY", message: "Không thể kết nối máy chủ API." });
  }
}
