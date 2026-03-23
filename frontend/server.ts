import fs from "fs";
import path from "path";

// Point to the frontend directory (parent directory of server.ts)
const publicDir = path.resolve(path.dirname(import.meta.url.replace("file:///", "")).replace(/\\/g, "/"), ".");
const PORT = process.env.PORT || 8000;

// MIME type mapping
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
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

function getMimeType(filepath: string): string {
  const ext = path.extname(filepath).toLowerCase();
  return mimeTypes[ext] || "application/octet-stream";
}

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    // 1. Force the root to load the master dashboard
    if (pathname === "/" || pathname === "") {
      pathname = "/master-dashboard.html";
    }

    // 2. Build the full path to the file
    let filePath = path.join(publicDir, pathname);

    // 3. Check if file exists and serve it
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      // If it's a directory, try to serve index.html or master-dashboard.html
      if (stats.isDirectory()) {
        const indexPath = path.join(filePath, "index.html");
        if (fs.existsSync(indexPath)) {
          filePath = indexPath;
        } else {
          // Directory listing not allowed, serve master dashboard instead
          filePath = path.join(publicDir, "master-dashboard.html");
        }
      }

      // Serve the file with correct MIME type
      if (fs.existsSync(filePath)) {
        const mimeType = getMimeType(filePath);
        return new Response(Bun.file(filePath), {
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    // 4. Fallback to master-dashboard for any unknown routes (SPA support)
    const fallbackPath = path.join(publicDir, "master-dashboard.html");
    if (fs.existsSync(fallbackPath)) {
      return new Response(Bun.file(fallbackPath), {
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    return new Response("404 Not Found", { status: 404 });
  },
});

console.log(`🚀 Frontend server running at http://localhost:${PORT}`);
console.log(`📍 Serving from: ${publicDir}`);