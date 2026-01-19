import { IsNotEmpty, Matches } from "class-validator";
import { PASSWORD_REGEX, PASSWORD_RULE_MESSAGE } from "../../common/validators/password.validator";

export class ResetPasswordDto {
  @IsNotEmpty()
  token!: string;

  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULE_MESSAGE })
  newPassword!: string;
}
