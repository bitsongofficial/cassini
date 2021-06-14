import { ethers } from "ethers";
import { Column, Double, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class EthereumTx {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    height: number;

    @Column()
    hash: string;

    @Column()
    from: string;

    @Column()
    to: string;

    @Column()
    amount: string; // big number

    @Column()
    migrated_amount: string;

    @Column()
    fee: string;

    @Column()
    status: string;

    @Column()
    cosmos_nonce: number;

    @Column()
    cosmos_hash: string;

    @Column()
    created_at: Date;
}
