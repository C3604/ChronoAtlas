import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { RoleName } from "../common/roles.enum";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";
import { AuthUser } from "../auth/auth.types";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.SUPER_ADMIN, RoleName.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listUsers() {
    const users = await this.usersService.listUsers();
    return { items: users.map((user) => this.toUserResponse(user)) };
  }

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    if (await this.usersService.isEmailTaken(dto.email)) {
      throw new BadRequestException({ code: "AUTH_005", message: "邮箱已被注册" });
    }
    const result = await this.usersService.createUser({
      email: dto.email,
      displayName: dto.displayName,
      password: dto.password,
      roles: dto.roles,
      isActive: dto.isActive
    });
    if (!result.ok) {
      throw new BadRequestException({ code: "AUTH_005", message: "邮箱已被注册" });
    }
    return { user: this.toUserResponse(result.user) };
  }

  @Patch(":id")
  async updateUser(@Param("id") id: string, @Body() dto: UpdateUserDto, @Req() req: { user: AuthUser }) {
    const target = await this.usersService.findById(id);
    if (!target) {
      throw new NotFoundException({ code: "COMMON_404", message: "用户不存在" });
    }
    const isSelf = req.user.id === target.id;
    if (isSelf && dto.isActive === false) {
      throw new BadRequestException({ code: "AUTH_009", message: "不能禁用自己的账号" });
    }

    const targetRoles = target.roles.map((role) => role.name);
    const isTargetSuper = targetRoles.includes(RoleName.SUPER_ADMIN);
    const currentIsSuper = req.user.roles.includes(RoleName.SUPER_ADMIN);

    if (isTargetSuper && !currentIsSuper) {
      throw new ForbiddenException({ code: "PERM_002", message: "没有权限修改超级管理员" });
    }
    if (dto.roles && dto.roles.includes(RoleName.SUPER_ADMIN) && !currentIsSuper) {
      throw new ForbiddenException({ code: "PERM_002", message: "没有权限分配超级管理员" });
    }

    if (dto.email && (await this.usersService.isEmailTaken(dto.email, target.id))) {
      throw new BadRequestException({ code: "AUTH_005", message: "邮箱已被注册" });
    }

    if (isTargetSuper && (dto.isActive === false || (dto.roles && !dto.roles.includes(RoleName.SUPER_ADMIN)))) {
      const count = await this.usersService.countSuperAdmins();
      if (count <= 1) {
        throw new BadRequestException({ code: "AUTH_011", message: "必须保留至少一个超级管理员" });
      }
    }

    const updated = await this.usersService.updateUser(target, {
      email: dto.email,
      displayName: dto.displayName,
      isActive: dto.isActive,
      roles: dto.roles
    });

    if (dto.password) {
      await this.usersService.updatePassword(updated, dto.password);
    }

    return { user: this.toUserResponse(updated) };
  }

  private toUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles?.map((role: any) => role.name) ?? [],
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    };
  }
}
