export type TenantUser = {
  userId: number;
  email: string;
  rol: string;
  negocios: number[];
};

export type TenantContext = {
  negocioId: number | null;
  isOwner: boolean;
  negociosAccesibles: number[];
};
