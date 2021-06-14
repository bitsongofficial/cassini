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

    @Column({ type: "bigint"})
    amount: number;

    @Column({ type: "bigint"})
    migrated_amount: number;

    @Column({ type: "bigint"})
    fee: number;

    @Column()
    status: string;

    @Column()
    eth_nonce: number;

    @Column()
    eth_hash: string;
}
