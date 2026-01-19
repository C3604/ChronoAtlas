import { IsArray, IsEmail, IsNotEmpty, IsOptional, Length, Matches } from "class-validator";
import { RoleName } from "../../common/roles.enum";
import { PASSWORD_REGEX, PASSWORD_RULE_MESSAGE } from "../../common/validators/password.validator";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @Length(2, 64)
  displayName!: string;

  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULE_MESSAGE })
  password!: string;

  @IsOptional()
  @IsArray()
  roles?: RoleName[];

  @IsOptional()
  isActive?: boolean;
}
