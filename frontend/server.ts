import fs from "fs";
import path from "path";

const publicDir = "./";
const PORT = process.env.PORT || 8000;

const server = Bun.serve({
  port: PORT,
  fetch(request) {
    const url = new URL(request.url);
    // Remove leading slash from pathname to avoid absolute path issues with path.join
    const pathname = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
    let filePath = path.join(publicDir, pathname);

    // If no file specified, serve master-dashboard.html from pages
    if (pathname === '' || pathname === '/' || filePath.endsWith("/")) {
      filePath = path.join(publicDir, "pages/master-dashboard.html");
    }

    // Try to read the file
    try {
      if (fs.existsSync(filePath)) {
        const file = Bun.file(filePath);
        // Set appropriate content-type based on file extension
        let contentType = "text/html";
        if (filePath.endsWith(".css")) contentType = "text/css";
        else if (filePath.endsWith(".js")) contentType = "application/javascript";
        else if (filePath.endsWith(".json")) contentType = "application/json";
        
        return new Response(file, {
          headers: { "Content-Type": contentType }
        });
      }
      
      // If file not found, try with master-dashboard.html (for SPA routing)
      const fallback = path.join(publicDir, "pages/master-dashboard.html");
      if (fs.existsSync(fallback)) {
        const file = Bun.file(fallback);
        return new Response(file, {
          headers: { "Content-Type": "text/html" }
        });
      }

      return new Response("404 Not Found", { status: 404 });
    } catch (error) {
      console.error("Error serving file:", error);
      return new Response("500 Internal Server Error", { status: 500 });
    }
  },
});

console.log(`🚀 Frontend server running at http://localhost:${PORT}`);
console.log(`📍 Serving files from: ${path.resolve(publicDir)}`);
console.log(`📄 Root page: pages/master-dashboard.html`);
