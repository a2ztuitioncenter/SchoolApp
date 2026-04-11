import fs from "fs";
import path from "path";

// Resolve frontend directory
const publicDir = path.resolve(
  path.dirname(import.meta.url.replace("file:///", "")).replace(/\\/g, "/"),
  "."
);

const PORT = process.env.PORT || 8000;

console.log("[CONFIG] Frontend Server Configuration:");
console.log(`  - Port: ${PORT}`);
console.log(`  - NOTE: API calls are handled by frontend JavaScript directly`);
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
  hostname: "0.0.0.0",
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);
    let pathname = url.pathname;


    //  FORCE ROOT → INDEX
    if (pathname === "/") {
      pathname = "/index.html";
    }

    const filePath = path.join(publicDir, pathname);

    //  Serve file if exists with Browser Caching
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return new Response(Bun.file(filePath), {
        headers: {
          "Content-Type": getMimeType(filePath),
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    //FALLBACK → INDEX (NO DIRECTORY LISTING EVER)
    const fallback = path.join(publicDir, "index.html");

    return new Response(Bun.file(fallback), {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  },
});

console.log(`\nFrontend server running on port ${PORT}`);
console.log(`  Local: http://localhost:${PORT}`);
console.log(`  Network: http://0.0.0.0:${PORT}`);
console.log(`  Tunnel: Use your cloudflared tunnel URL\n`);