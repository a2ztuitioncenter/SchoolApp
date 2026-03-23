import fs from "fs";
import path from "path";

// Resolve frontend directory
const publicDir = path.resolve(
  path.dirname(import.meta.url.replace("file:///", "")).replace(/\\/g, "/"),
  "."
);

const PORT = process.env.PORT || 8000;

// MIME types
const mimeTypes: { [key: string]: string } = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function getMimeType(filePath: string) {
  return mimeTypes[path.extname(filePath)] || "application/octet-stream";
}

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // 🔥 FORCE ROOT → MASTER DASHBOARD
    if (pathname === "/") {
      pathname = "/master-dashboard.html";
    }

    const filePath = path.join(publicDir, pathname);

    // ✅ Serve file if exists
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return new Response(Bun.file(filePath), {
        headers: {
          "Content-Type": getMimeType(filePath),
        },
      });
    }

    // 🔥 FALLBACK → MASTER DASHBOARD (NO DIRECTORY LISTING EVER)
    const fallback = path.join(publicDir, "master-dashboard.html");

    return new Response(Bun.file(fallback), {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
});

console.log(`🚀 Server running at http://localhost:${PORT}`);