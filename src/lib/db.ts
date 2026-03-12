import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './drizzle';

const connectionString = process.env.DATABASE_URL!;

// Para consultas
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
