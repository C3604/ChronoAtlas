import { IsEmail, IsNotEmpty, Length, Matches } from "class-validator";
import { PASSWORD_REGEX, PASSWORD_RULE_MESSAGE } from "../../common/validators/password.validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @Length(2, 64)
  displayName!: string;

  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULE_MESSAGE })
  password!: string;
}
