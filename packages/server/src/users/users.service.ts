import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import bcrypt from "bcrypt";
import { UserEntity } from "./entities/user.entity";
import { RoleEntity } from "./entities/role.entity";
import { RoleName } from "../common/roles.enum";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoleEntity) private readonly roleRepo: Repository<RoleEntity>,
    private readonly config: ConfigService
  ) {}

  async ensureDefaultRoles() {
    const existing = await this.roleRepo.find();
    const existingNames = new Set(existing.map((role) => role.name));
    const roles: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.ADMIN, RoleName.EDITOR, RoleName.USER];
    const toCreate = roles.filter((role) => !existingNames.has(role));
    if (toCreate.length === 0) {
      return;
    }
    await this.roleRepo.save(toCreate.map((name) => this.roleRepo.create({ name })));
  }

  async ensureDefaultAdmin() {
    const count = await this.userRepo.count();
    if (count > 0) {
      return;
    }
    const email = (this.config.get<string>("BOOTSTRAP_ADMIN_EMAIL") ?? "admin@chronoatlas.local")
      .trim()
      .toLowerCase();
    const password = this.config.get<string>("BOOTSTRAP_ADMIN_PASSWORD") ?? "admin123";
    const displayName = this.config.get<string>("BOOTSTRAP_ADMIN_NAME") ?? "管理员";
    const role = await this.roleRepo.findOne({ where: { name: RoleName.SUPER_ADMIN } });
    if (!role) {
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      email,
      displayName,
      passwordHash,
      isActive: true,
      emailVerified: true,
      roles: [role]
    });
    await this.userRepo.save(user);
  }

  async isEmailTaken(email: string, excludeId?: string) {
    const found = await this.userRepo.findOne({ where: { email: normalizeEmail(email) } });
    if (!found) {
      return false;
    }
    if (excludeId && found.id === excludeId) {
      return false;
    }
    return true;
  }

  async findByEmail(email: string) {
    return this.userRepo.findOne({ where: { email: normalizeEmail(email) } });
  }

  async findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  async listUsers() {
    return this.userRepo.find({ order: { createdAt: "DESC" } });
  }

  async countSuperAdmins() {
    return this.userRepo
      .createQueryBuilder("user")
      .leftJoin("user.roles", "role")
      .where("role.name = :name", { name: RoleName.SUPER_ADMIN })
      .getCount();
  }

  async createUser(params: {
    email: string;
    displayName: string;
    password: string;
    roles?: RoleName[];
    isActive?: boolean;
  }) {
    const email = normalizeEmail(params.email);
    const existing = await this.findByEmail(email);
    if (existing) {
      return { ok: false, reason: "EMAIL_EXISTS" } as const;
    }
    const passwordHash = await bcrypt.hash(params.password, 10);
    const roleNames = params.roles && params.roles.length > 0 ? params.roles : [RoleName.USER];
    const roles = await this.roleRepo.find({ where: roleNames.map((name) => ({ name })) });
    if (roles.length === 0) {
      const fallback = await this.roleRepo.findOne({ where: { name: RoleName.USER } });
      if (fallback) {
        roles.push(fallback);
      }
    }
    const entity = this.userRepo.create({
      email,
      displayName: params.displayName.trim(),
      passwordHash,
      isActive: params.isActive ?? true,
      emailVerified: false,
      roles
    });
    const saved = await this.userRepo.save(entity);
    return { ok: true, user: saved } as const;
  }

  async updateUser(
    user: UserEntity,
    updates: {
      email?: string;
      displayName?: string;
      isActive?: boolean;
      roles?: RoleName[];
    }
  ) {
    if (updates.email) {
      user.email = normalizeEmail(updates.email);
    }
    if (updates.displayName) {
      user.displayName = updates.displayName.trim();
    }
    if (typeof updates.isActive === "boolean") {
      user.isActive = updates.isActive;
    }
    if (updates.roles && updates.roles.length > 0) {
      user.roles = await this.roleRepo.find({ where: updates.roles.map((name) => ({ name })) });
    }
    return this.userRepo.save(user);
  }

  async setEmailVerified(user: UserEntity) {
    user.emailVerified = true;
    return this.userRepo.save(user);
  }

  async updatePassword(user: UserEntity, password: string) {
    user.passwordHash = await bcrypt.hash(password, 10);
    return this.userRepo.save(user);
  }

  async updateLastLogin(user: UserEntity) {
    user.lastLoginAt = new Date();
    return this.userRepo.save(user);
  }
}
