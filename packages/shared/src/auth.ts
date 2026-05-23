export type UserRole = 'ADMIN' | 'CHILD';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  worldId: string | null;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

