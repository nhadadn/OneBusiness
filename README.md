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

## Accesibilidad (WCAG) — Contraste de labels

Estándar objetivo:
- Texto normal (≈14–16px): ratio mínimo 4.5:1
- Texto grande (≥24px o ≥18.66px bold): ratio mínimo 3:1

Decisiones de UI para asegurar contraste en “labels” (títulos secundarios, captions, descripciones, metadata):
- Fondo global de la app: `#f8fafc` (slate-50) para evitar degradados que bajen contraste.
- Labels y textos “muted” usados como etiquetas: `text-slate-600` (en vez de `text-slate-500`) para margen de seguridad.
- Placeholders en inputs: `text-slate-500` (evitar tonos tipo `slate-400`).
- Badges: se usan variantes con colores reales (no tokens Tailwind no configurados) y contraste alto (primary/secondary en blanco).

Validación rápida (Node) para calcular contraste entre dos hex:
```bash
node -e "function h2r(h){h=h.replace('#','');const n=parseInt(h,16);return{r:(n>>16)&255,g:(n>>8)&255,b:n&255}} function s(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)} function L(x){const R=s(x.r),G=s(x.g),B=s(x.b);return 0.2126*R+0.7152*G+0.0722*B} function C(a,b){const A=L(h2r(a)),B=L(h2r(b));const hi=Math.max(A,B),lo=Math.min(A,B);return (hi+0.05)/(lo+0.05)} console.log('contrast',C('#475569','#f8fafc').toFixed(2))"
```

Recomendado para revisión visual:
- Chrome DevTools → Lighthouse → Accessibility
- Validadores de contraste (ej. WebAIM Contrast Checker)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
