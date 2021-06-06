import { CosmosClient } from "@cosmjs/launchpad";
import { cfg, TxStatus } from "../config"
import { getCosmosTransaction, saveCosmosTransaction } from "./utils";
import { ethers } from "ethers";

function setupClient() {
    return new CosmosClient(cfg.CosmosApi)
}

export async function getCurrentHeight() {

    const client = setupClient();
    return await client.getHeight();
}

export async function parseBlock(height: number) {
    console.log(`Parsing Cosmos Mainnet Block #${height}...`)

    const client = setupClient();

    const txs = await client.searchTx({ height: height, sentFromOrTo: cfg.CosmosBridgeAddress })

    for (const tx of txs) {

        const dbTx = await getCosmosTransaction(tx.hash)

        if (dbTx !== undefined) {
            console.log(`TX ${tx.hash} already indexed`)
            continue;
        }

        // Check ETH Address
        const ETHAddress = tx.tx.value.memo;
        var status = TxStatus.Processing;

        // Check valid address
        if (!ethers.utils.isAddress(ETHAddress)) {
            status = TxStatus.Invalid;
        }

        let [from, amount] = sumMsgsAmounts(tx)

        if (amount > 0) {

            let data = {
                height,
                amount,
                from,
                to: ETHAddress,
                hash: tx.hash,
                status,
                timestamp: tx.timestamp
            }

            const savedTx = await saveCosmosTransaction(data)
            console.log(`Added tx to queue with id ${savedTx.id} hash: ${savedTx.hash}`)

        } else {
            console.log(`Ignoring tx ${tx.hash} with 0 valid amount`)
        }
    }


    return txs.length
}

export function sumMsgsAmounts(tx) {

    let amount = 0;
    let from = "";

    for (let msg of tx.tx.value.msg) {

        // Skip message
        if (msg.type !== "cosmos-sdk/MsgSend") {
            continue;
        }

        // Skip if to is not our address
        if (msg.value.to_address !== cfg.CosmosBridgeAddress) {
            continue
        }

        // Loop balances sent
        for (let coin of msg.value.amount) {

            // Skip wrong denoms
            if (coin.denom !== cfg.CosmosBitsongDenom) {
                continue;
            }

            amount += parseInt(coin.amount);
        }

        from = msg.value.from_address;
    }

    return [from, amount]
}

export function getAddressFromMemo(tx: any) {
    const ETHAddress = tx.tx.value.memo;
    if (!ethers.utils.isAddress(ETHAddress)) {
        return null;
    }

    return ETHAddress
}

// This function double check that a specific tx hash has correct amount, from and to
export async function checkTxAmounts(hash: string, internalAmount: number, internalFrom: string, to: string) {
    const client = setupClient();

    const tx = await client.getTx(hash)
    const ETHAddress = getAddressFromMemo(tx)

    // Check valid address
    if (ETHAddress !== to) {
        return false
    }

    // Check valid amount
    let [from, amount] = sumMsgsAmounts(tx)

    if (amount !== internalAmount || from !== internalFrom) {
        console.log("OK", internalAmount, amount)
        return false;
    }

    return true;
}