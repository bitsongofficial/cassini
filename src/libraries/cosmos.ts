import {
    IndexedTx,
    StargateClient,
    SigningStargateClient,
    calculateFee,
    GasPrice,
    coins,
    parseCoins
} from "@cosmjs/stargate";

import {
    decodeTxRaw
} from "@cosmjs/proto-signing"

import { Secp256k1HdWallet, Secp256k1HdWalletOptions } from "@cosmjs/amino"
import { cfg, TxStatus } from "../config"
import { getCosmosTransaction, saveCosmosTransaction } from "./utils";
import { ethers } from "ethers";
import { bech32, bech32m } from "bech32";
import { getRepository } from "typeorm";
import { EthereumTx } from "../entity/EthereumTx";
import * as eth from "./ethereum"
import BN from "bignumber.js"
import { HdPath, Slip10RawIndex } from "@cosmjs/crypto";

async function getTransactionTimestamp(tx: IndexedTx, client: StargateClient) {

    // Tx timestamp is the same of block timestamp
    const block = await client.getBlock(tx.height);

    return block.header.time
}

function decodeTx(tx: IndexedTx) {
    return decodeTxRaw(tx.tx);
}

async function setupClient() {
    return await StargateClient.connect(cfg.CosmosApi)
}

async function setupWallet() {

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
    return wallet
}

async function setupSigningClient(wallet: Secp256k1HdWallet) {
    const client = await SigningStargateClient.connectWithSigner(cfg.CosmosApi, wallet);
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
        if (delta > cfg.EthereumConfirmations) {

            tx.status = TxStatus.Waiting;
            await repo.save(tx)

            // Convert amount to cosmos format
            const amount = ethers.BigNumber.from(tx.amount);
            const amountToSend = amount.sub(tx.fee);

            const convAmount = parseInt(convertWeiToUbtsg(amountToSend.toString()));

            // We can send transaction cosmos side
            const wallet = await setupWallet();
            const client = await setupSigningClient(wallet);

            const [{ address }] = await wallet.getAccounts();

            // calculate fee
            const fee = calculateFee(200000, GasPrice.fromString(cfg.CosmosGasPrice));

            const result = await client.sendTokens(address, tx.to, coins(convAmount, cfg.CosmosDenom), fee, "bridge");

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
    } catch (e) {
        return false
    }

    return false
}

export async function getCurrentHeight() {
    const client = await setupClient();
    return await client.getHeight();
}

export async function parseBlock(height: number) {
    console.log(`Parsing Cosmos Mainnet Block #${height}...`)

    const client = await setupClient();

    const txs = await client.searchTx({ height: height, sentFromOrTo: cfg.CosmosBridgeAddress })

    for (const tx of txs) {

        const dbTx = await getCosmosTransaction(tx.hash)

        if (dbTx !== undefined) {
            console.log(`TX ${tx.hash} already indexed`)
            continue;
        }

        // decode tx
        const decodedTx = decodeTx(tx);

        // Check ETH Address
        const ETHAddress = decodedTx.body.memo;
        var status = TxStatus.Processing;

        // Check valid address
        if (!ethers.utils.isAddress(ETHAddress)) {
            status = TxStatus.Invalid;
        }

        // Set errored txs as invalid
        if (tx.code !== 0) {
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
                timestamp: await getTransactionTimestamp(tx, client)
            }

            console.log(data)
            const savedTx = await saveCosmosTransaction(data)
            console.log(`Added tx to queue with id ${savedTx.id} hash: ${savedTx.hash}`)

        } else {
            console.log(`Ignoring tx ${tx.hash} with 0 valid amount`)
        }
    }


    return txs.length
}


export function sumMsgsAmounts(tx: IndexedTx) {

    // decode tx
    const logs = JSON.parse(tx.rawLog);

    let amount = 0;
    let from = "";

    if (logs !== undefined) {

        for (let log of logs) {
            for (let event of log.events) {

                if (event.type === "transfer") {

                    let recipient = event.attributes.find(a => a.key === "recipient");
                    let sender = event.attributes.find(a => a.key === "sender");
                    let amountData = event.attributes.find(a => a.key === "amount");

                    if (recipient == undefined || sender == undefined || amount == undefined) {
                        continue;
                    }

                    if (recipient.value !== cfg.CosmosBridgeAddress) {
                        continue;
                    }


                    let coins = parseCoins(amountData.value);

                    for (let coin of coins) {
                        if (coin.denom !== cfg.CosmosDenom) {
                            continue;
                        }

                        amount += parseInt(coin.amount);
                    }

                    from = sender.value;
                }
            }
        }

    }

    return [from, amount]
}

export function getAddressFromMemo(tx: IndexedTx) {
    // decode tx
    const decodedTx = decodeTx(tx);

    const ETHAddress = decodedTx.body.memo;
    if (!ethers.utils.isAddress(ETHAddress)) {
        return null;
    }

    return ETHAddress
}

// This function double check that a specific tx hash has correct amount, from and to
export async function checkTxAmounts(hash: string, internalAmount: number, internalFrom: string, to: string) {
    const client = await setupClient();

    const tx = await client.getTx(hash)
    const ETHAddress = getAddressFromMemo(tx)

    // Check valid address
    if (ETHAddress !== to) {
        return false
    }

    // Check valid amount
    let [from, amount] = sumMsgsAmounts(tx)

    if (amount.toString() !== internalAmount.toString() || from !== internalFrom) {
        console.log("Wrong amounts", internalAmount, amount, from, internalFrom)
        return false;
    }

    return true;
}