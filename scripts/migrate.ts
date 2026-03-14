// scripts/migrate.ts
import { config } from 'dotenv';

// Cargar .env antes de leer process.env
config({ path: '.env' });
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

function getConnectionString(): string {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error('DATABASE_URL no está definida');
  }
  return value;
}

async function runMigrations() {
  console.log('🔄 Aplicando migraciones...');

  const connectionString = getConnectionString();

  const sql = postgres(connectionString, {
    max: 1,
    onnotice: () => {},
  });

  const db = drizzle(sql);

  try {
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('✅ Migraciones aplicadas correctamente');
  } finally {
    await sql.end();
    console.log('🔌 Conexión cerrada');
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error en migraciones:', error);
    process.exit(1);
  });
