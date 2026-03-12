# OneBusiness

ONEBusiness powered by Nazmel-IA

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Base de datos (Desarrollo)

### Migraciones

```bash
npm run db:migrate
```

### Seed (datos iniciales)

```bash
npm run db:seed
```

### Credenciales de prueba

- Dueño: `dueño@onebusiness.test` / `test123456`
- Socio: `socia@onebusiness.test` / `test123456`
- Admin: `admin@onebusiness.test` / `test123456`
- Externo: `externo@onebusiness.test` / `test123456`

### Datos insertados por el seed

- 10 negocios del holding (IDs fijos 1..10, incluyendo “Gastos Personales” id=10)
- 4 roles (Dueño, Socio, Admin, Externo)
- 13 centros de costo (para los negocios 1..4)
- 4 usuarios de prueba y sus asignaciones usuario_negocio

## Tests

```bash
npm test
npm run test:coverage
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
