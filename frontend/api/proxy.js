const backend = "https://snsqb.duckdns.org";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const incoming = new URL(req.url, "https://proxy.invalid");
  const path = incoming.searchParams.get("path") || "";
  incoming.searchParams.delete("path");
  const target = new URL(`/api/v1/${path}`, backend);
  if (target.origin !== backend || !target.pathname.startsWith("/api/v1/")) {
    res.status(400).end();
    return;
  }
  target.search = incoming.searchParams.toString();
  // Forward only API headers. In particular, do not forward browser Origin:
  // the upstream call is server-to-server and does not require browser CORS.
  const headers = new Headers();
  for (const name of ["accept", "content-type", "authorization"]) {
    const value = req.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }
  const method = req.method || "GET";
  res.setHeader("Cache-Control", "no-store");
  try {
    const chunks = [];
    if (method !== "GET" && method !== "HEAD") {
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
    }
    const upstreamTimeout = /^\/api\/v1\/questions\/[1-9]\d*\/ai-refine$/.test(target.pathname) && method === "POST" ? 85000 : 14000;
    const response = await fetch(target, {
      method,
      headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(upstreamTimeout),
    });
    res.status(response.status);
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    const disposition = response.headers.get("content-disposition");
    if (disposition) res.setHeader("Content-Disposition", disposition);
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.status(502).json({ message: "Không thể kết nối máy chủ API." });
  }
}
