import { 
    CosmosClient, 
    Secp256k1HdWallet,
    SigningCosmosClient,
    coins,
    GasPrice,
    BroadcastMode
} from "@cosmjs/launchpad";
import {Secp256k1HdWalletOptions} from "@cosmjs/amino"
import { cfg, TxStatus } from "../config"
import { getCosmosTransaction, saveCosmosTransaction } from "./utils";
import { ethers } from "ethers";
import { bech32, bech32m } from "bech32";
import { getRepository } from "typeorm";
import { EthereumTx } from "../entity/EthereumTx";
import * as eth from "./ethereum"
import BN from "bignumber.js"
import { HdPath, Slip10RawIndex } from "@cosmjs/crypto";

function setupClient() {
    return new CosmosClient(cfg.CosmosApi)
}

async function setupSigningClient() {

     const path: HdPath = [
        Slip10RawIndex.hardened(44),
        Slip10RawIndex.hardened(639),
        Slip10RawIndex.hardened(0),
        Slip10RawIndex.normal(0),
        Slip10RawIndex.normal(0),
     ];
     
    let options: Secp256k1HdWalletOptions = {
        bip39Password: undefined,
        hdPaths: [path],
        prefix: "bitsong",
    }

    const wallet = await Secp256k1HdWallet.fromMnemonic(cfg.CosmosMnemonic, options);
    const [{ address }] = await wallet.getAccounts();

    console.log(address)
    const client = new SigningCosmosClient(cfg.CosmosApi, address, wallet, GasPrice.fromString(cfg.CosmosGasPrice));
    return client;
}

export async function processQueue() {

    const repo = getRepository(EthereumTx)

    const pendingTxs = await repo.find({
        status: TxStatus.Processing
    })

    // Last nonce 
    var nonce = null;
    const lastTx = await repo.findOne({
        order: {
            cosmos_nonce: "DESC",
        }
    });

    if (lastTx !== undefined) {
        nonce = lastTx.cosmos_nonce;
    }

    // Current height
    var curBlock = await eth.getCurrentHeight()

    for (let tx of pendingTxs) {

        // Check confirmations
        var delta = Math.abs(curBlock - tx.height);
        if (delta > 21) {

            tx.status = TxStatus.Waiting;
            await repo.save(tx)

            // Convert amount to cosmos format
            const amount = ethers.BigNumber.from(tx.amount);
            const amountToSend = amount.sub(tx.fee);

            const convAmount = parseInt(convertWeiToUbtsg(amountToSend.toString()));

            // We can send transaction cosmos side
            const client = await setupSigningClient();

            const result = await client.sendTokens(tx.to, coins(convAmount, cfg.CosmosDenom), "bridge");

            // todo
            tx.cosmos_nonce = 0;
            tx.cosmos_hash = result.transactionHash;
            tx.migrated_amount = amountToSend.toString();
            tx.status = TxStatus.Completed;

            await repo.save(tx)
        }
    }
}

export const convertWeiToUbtsg = function (value) {
    value = new BN(value)
    value = value.times(new BN(0.000000000000000001))

    return new BN(value).times(new BN(1000000)).toFixed(0)
}

export async function isAddress(address: string) {
    try {
        let decoded = bech32.decode(address);

        if (decoded) {
            return true;
        }
    } catch(e) {
        return false
    }

    return false
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
            if (coin.denom !== cfg.CosmosDenom) {
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