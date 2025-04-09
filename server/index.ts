import "dotenv/config"; // Importación crítica para cargar .env
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Middlewares base
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de logging de requests
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Interceptamos la respuesta JSON
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Logging al finalizar la request
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // Truncar líneas largas
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Inicialización asincrónica
(async () => {
  try {
    const server = await registerRoutes(app);

    // Manejador de errores global
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // Configuración de Vite solo en desarrollo
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Iniciar servidor
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`✅ Server running on port ${port}`);
      log(`🔗 Environment: ${process.env.NODE_ENV || "development"}`);
      log(`📡 Database: ${process.env.DATABASE_URL ? "Connected" : "Disconnected"}`); // Debug de conexión
    });

  } catch (error) {
    log("🔥 Failed to start server:");
    console.error(error);
    process.exit(1);
  }
})();
