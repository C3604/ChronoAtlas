import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { RoleName } from "../../common/roles.enum";

@Entity("roles")
export class RoleEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  name!: RoleName;
}
