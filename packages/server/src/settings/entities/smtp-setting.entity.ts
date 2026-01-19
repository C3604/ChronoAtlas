import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "smtp_settings" })
export class SmtpSettingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "boolean", default: false })
  enabled!: boolean;

  @Column({ type: "varchar", length: 255, default: "" })
  host!: string;

  @Column({ type: "int", default: 587 })
  port!: number;

  @Column({ type: "boolean", default: false })
  secure!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  username?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  password?: string | null;

  @Column({ name: "from_address", type: "varchar", length: 255, nullable: true })
  fromAddress?: string | null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
