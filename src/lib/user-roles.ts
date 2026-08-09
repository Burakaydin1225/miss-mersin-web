export const USER_ROLE = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const;

export type UserRoleValue =
  (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const USER_ROLE_LABELS: Record<
  UserRoleValue,
  string
> = {
  [USER_ROLE.OWNER]: "Ana Yönetici",
  [USER_ROLE.ADMIN]: "Admin",
  [USER_ROLE.EDITOR]: "Düzenleyici",
  [USER_ROLE.VIEWER]: "Görüntüleyici",
};