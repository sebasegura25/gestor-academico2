import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";  // Asegúrate de la ruta correcta

// Configuración de WebSocket (solo necesario para entornos serverless/edge)
neonConfig.webSocketConstructor = ws;

// Validación de variable de entorno
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configuración del pool de conexiones
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,  // Obligatorio para Neon
});

// Configuración de Drizzle con el esquema
export const db = drizzle(pool, { schema });
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

// Configuración crítica para entornos serverless
neonConfig.webSocketConstructor = ws; 

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});
