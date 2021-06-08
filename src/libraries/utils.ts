import { getRepository } from "typeorm";
import { CosmosTx } from "../entity/CosmosTx";
import { cfg } from "../config"
import { ethers } from "ethers";

export async function getCosmosTransaction(hash: string) {

    const repo = getRepository(CosmosTx)

    const tx = await repo.findOne({
        hash: hash
    })

    return tx
}

export async function saveCosmosTransaction(data: any) {
    const repo = getRepository(CosmosTx)

    let tx = new CosmosTx();

    tx.height = data.height;
    tx.from = data.from;
    tx.to = data.to;
    tx.amount = data.amount;
    tx.migrated_amount = 0;
    tx.hash = data.hash;
    tx.status = data.status;
    tx.timestamp = data.timestamp;
    tx.fee = calculateBridgeFee(data.amount)
    tx.eth_hash = "";
    tx.eth_nonce = 0;

    return await repo.save(tx)
}

export function calculateBridgeFee(amount: number) {

    const fee = amount * cfg.BridgeFeePercent;

    return Math.max(cfg.BridgeMinFee, fee)
}

export function convertCosmosBalanceToWei(amount: number) {

    // Cosmos has 6 decimals
    // ETH has 18 decimals

    const coefficent = ethers.BigNumber.from(1000000000000);
    var bnAmount = ethers.BigNumber.from(amount).mul(coefficent)
    return bnAmount;
}