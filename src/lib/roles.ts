export const userRoles = ["ADMIN", "OFFICE_USER", "ROAD_USER"] as const;

export type UserRole = (typeof userRoles)[number];

export function isUserRole(value: string | null | undefined): value is UserRole {
  return value === "ADMIN" || value === "OFFICE_USER" || value === "ROAD_USER";
}

export function isOfficeRole(role: string | null | undefined) {
  return role === "ADMIN" || role === "OFFICE_USER";
}
