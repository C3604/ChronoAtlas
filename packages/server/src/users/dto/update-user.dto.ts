import { IsArray, IsEmail, IsOptional, Length, Matches } from "class-validator";
import { RoleName } from "../../common/roles.enum";
import { PASSWORD_REGEX, PASSWORD_RULE_MESSAGE } from "../../common/validators/password.validator";

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Length(2, 64)
  displayName?: string;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  roles?: RoleName[];

  @IsOptional()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULE_MESSAGE })
  password?: string;
}
