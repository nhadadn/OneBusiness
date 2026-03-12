export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    negocios: number[];
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  success: boolean;
  accessToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface AuthResult {
  success: boolean;
  user?: {
    userId: number;
    email: string;
    rol: string;
    negocios: number[];
  };
  error?: string;
}
