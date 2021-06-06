import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class CosmosTx {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    height: number;

    @Column()
    timestamp: string;

    @Column()
    hash: string;

    @Column()
    from: string;

    @Column()
    to: string;

    @Column()
    amount: number;

    @Column()
    migrated_amount: number;

    @Column()
    fee: number;

    @Column()
    status: string;
}
