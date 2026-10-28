import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgrespassword@localhost:5432/diogo_barber';

// Deshabilitar prepare para compatibilidad con transacciones y entornos Docker/Coolify
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
