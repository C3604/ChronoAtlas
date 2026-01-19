import { RoleName } from "../common/roles.enum";

export type AuthPayload = {
  sub: string;
  email: string;
  displayName: string;
  roles: RoleName[];
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  roles: RoleName[];
};
