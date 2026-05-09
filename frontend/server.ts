import fs from "fs";
import path from "path";
import os from "os";

// Resolve frontend directory
const publicDir = import.meta.dir;

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

    // Proxy API calls to the backend
    if (pathname.startsWith("/api/")) {
      const backendHost = process.env.BACKEND_URL || "http://127.0.0.1:3000";
      const backendUrl = `${backendHost}${pathname}${url.search}`;
      
      const headers = new Headers(req.headers);
      headers.set("X-Forwarded-Host", url.host);
      headers.set("X-Forwarded-Proto", url.protocol.replace(':', ''));
      // Do NOT set "Host" to 127.0.0.1:3000 as it can break cookie domain matching

      console.log(`[PROXY] ${req.method} ${pathname} -> ${backendUrl}`);
      
      try {
        const response = await fetch(backendUrl, {
          method: req.method,
          headers: headers,
          body: req.body,
          // @ts-ignore
          duplex: "half" 
        });

        // Reconstruct response to ensure all headers (especially multiple Set-Cookie) are forwarded correctly
        const newHeaders = new Headers(response.headers);
        
        // Strip headers that interfere with the browser's own decoding, since fetch() automatically decompresses the body
        newHeaders.delete('Content-Encoding');
        newHeaders.delete('Content-Length');
        
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders
        });
      } catch (error) {
        console.error(`[PROXY ERROR] Failed to reach backend:`, error);
        return new Response(JSON.stringify({ error: "Backend unreachable" }), {
          status: 502,
          headers: { "Content-Type": "application/json" }
        });
      }
    }


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
console.log(`  Local:   http://localhost:${PORT}`);

// Dynamically detect network IP
const nets = os.networkInterfaces();
for (const name of Object.keys(nets)) {
  for (const net of nets[name]!) {
    if (net.family === 'IPv4' && !net.internal) {
      console.log(`  Network: http://${net.address}:${PORT} (Use this for mobile)`);
      break;
    }
  }
}