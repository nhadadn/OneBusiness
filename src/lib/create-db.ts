import 'dotenv/config';
import postgres from 'postgres';

function log(message: string) {
  process.stdout.write(`${message}\n`);
}

function logError(message: string) {
  process.stderr.write(`${message}\n`);
}

function getEnvDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL no está configurado');
  }
  return url;
}

function getDatabaseNameFromUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const raw = url.pathname.replace(/^\//, '');
  if (!raw) {
    throw new Error('DATABASE_URL no incluye nombre de base de datos');
  }
  return decodeURIComponent(raw);
}

function getAdminDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

async function main() {
  const databaseUrl = getEnvDatabaseUrl();
  const targetDb = getDatabaseNameFromUrl(databaseUrl);
  const adminUrl = getAdminDatabaseUrl(databaseUrl);

  log(`Verificando base de datos: ${targetDb}`);

  const sql = postgres(adminUrl, { max: 1 });
  try {
    const existing = await sql<{ exists: boolean }[]>`
      select exists(select 1 from pg_database where datname = ${targetDb}) as "exists"
    `;

    const exists = existing[0]?.exists === true;
    if (exists) {
      log('OK: La base de datos ya existe');
      return;
    }

    log('Creando base de datos...');
    await sql.unsafe(`CREATE DATABASE "${targetDb.replace(/"/g, '""')}"`);
    log('OK: Base de datos creada');
  } catch (error) {
    if (error instanceof Error) {
      logError(`Error creando/verificando base de datos: ${error.message}`);
    } else {
      logError(`Error creando/verificando base de datos: ${String(error)}`);
    }
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
