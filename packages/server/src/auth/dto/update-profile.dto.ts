import { IsNotEmpty, Length } from "class-validator";

export class UpdateProfileDto {
  @IsNotEmpty()
  @Length(2, 64)
  displayName!: string;
}
