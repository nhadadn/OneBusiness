import 'dotenv/config';
import postgres from 'postgres';

function log(message: string) {
  process.stdout.write(`${message}\n`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está configurado');
  }

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const negociosCount = (await sql<{ c: number }[]>`select count(*)::int as c from negocios`)[0]?.c ?? 0;
    const rolesCount = (await sql<{ c: number }[]>`select count(*)::int as c from roles`)[0]?.c ?? 0;
    const usuariosCount = (await sql<{ c: number }[]>`select count(*)::int as c from usuarios`)[0]?.c ?? 0;
    const centrosCostoCount =
      (await sql<{ c: number }[]>`select count(*)::int as c from centros_costo`)[0]?.c ?? 0;
    const usuarioNegocioCount =
      (await sql<{ c: number }[]>`select count(*)::int as c from usuario_negocio`)[0]?.c ?? 0;

    log(`negocios: ${negociosCount}`);
    log(`roles: ${rolesCount}`);
    log(`usuarios: ${usuariosCount}`);
    log(`centros_costo: ${centrosCostoCount}`);
    log(`usuario_negocio: ${usuarioNegocioCount}`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Error verificando BD: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
