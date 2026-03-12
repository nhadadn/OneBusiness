import 'dotenv/config';

import { asc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { roles } from '@/lib/drizzle';

async function main() {
  const rows = await db
    .select({
      id: roles.id,
      nombre: roles.nombre,
      descripcion: roles.descripcion,
    })
    .from(roles)
    .orderBy(asc(roles.id));

  process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
    } else {
      process.stderr.write(`${String(error)}\n`);
    }
    process.exit(1);
  });
