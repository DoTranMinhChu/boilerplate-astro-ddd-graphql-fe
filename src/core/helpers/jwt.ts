import { jwtDecode } from 'jwt-decode';

export const decodeJwt = (token: string) => {
  return jwtDecode(token);
};

export const isTokenExpired = (token: string) => {
  const { exp } = jwtDecode(token);
  if (!exp) return false;
  return exp * 1000 < Date.now();
};
