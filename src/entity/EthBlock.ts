import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class EthBlock {

    @PrimaryColumn()
    height: number;

    @Column()
    tx_count: number;

    @Column()
    parsed_at: Date;
}
