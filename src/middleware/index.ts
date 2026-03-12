export const PUBLIC_API_PREFIXES = ['/api/auth/login', '/api/auth/refresh'];

export const PROTECTED_API_PREFIXES = [
  '/api/movimientos',
  '/api/negocios',
  '/api/usuarios',
  '/api/cuentas',
  '/api/empleados',
  '/api/nomina',
  '/api/reportes',
];

export function isProtectedApiPath(pathname: string): boolean {
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
