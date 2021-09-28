import { Connection } from "typeorm";
import { CosmosBlock } from "./entity/CosmosBlock";
import { EthBlock } from "./entity/EthBlock";

import { cfg } from "./config"

import { getRepository } from "typeorm";
import { getCurrentHeight, parseBlock, processQueue } from "./libraries/cosmos";

import * as eth from "./libraries/ethereum";
import * as cron from "node-cron"

export async function startBridge(connection: Connection) {

    var syncing = false;

    // Start Cosmos Blocks Parsing
    cron.schedule(cfg.CosmosWatchInterval, async () => {
        if (syncing) {
            console.log("Skipping cosmos sync because already running.")
            return;
        }

        console.log("Task sync cosmos running " + new Date())

        syncing = true;
        try {
            const cosmosBlocksRepository = getRepository(CosmosBlock);
            const lastBlock = await cosmosBlocksRepository.findOne({
                order: {
                    height: "DESC",
                }
            })

            const lastHeight = lastBlock ? lastBlock.height : cfg.CosmosStartHeight;
            await syncCosmos(connection, lastHeight)
        } catch (e) {
            console.error(`Error cosmos sync: ${e.message}`)
        }
        
        syncing = false;
    });

    
    // Start Ethereum Blocks Parsing
    var syncingEth = false;
    cron.schedule(cfg.EthereumWatchInterval, async () => {

        if (syncingEth) {
            console.log("Skipping ethereum sync because already running.")
            return;      
        }

        console.log("Task sync ethereum running " + new Date())

        syncingEth = true;
        try {
            const ethBlocksRepository = getRepository(EthBlock);
            const lastBlock = await ethBlocksRepository.findOne({
                order: {
                    height: "DESC",
                }
            })
    
            const lastHeight = lastBlock ? lastBlock.height : cfg.EthereumStartHeight;
            await syncEthereum(connection, lastHeight)
        } catch (e) {
            console.error(`Error ethereum sync: ${e.message}`)
        }
        
        syncingEth = false;
    });


    // Start Ethereum Transaction Sending
    var processingEth = false;
    cron.schedule(cfg.EthereumSendingInterval, async () => {
        if (processingEth) {
            console.log("Skipping ethereum send because already running.")
            return;
        }

        processingEth = true;
        try {
            console.log("Sending pending Ethereum txs...")
            await eth.processQueue();
        } catch (e) {
            console.error(`Error cosmos send: ${e.message}`)
        }

        processingEth = false;
    });

    // Start Cosmos Transaction Sending
    var processingCosmos = false;
    cron.schedule(cfg.CosmosSendingInterval, async () => {
        if (processingCosmos) {
            console.log("Skipping ethereum send because already running.")
            return;
        }

        processingCosmos = true;
        try {
            console.log("Sending pending Cosmos txs...")
            await processQueue();
        } catch (e) {
            console.error(`Error ethereum send: ${e.message}`)
        }

        processingCosmos = false;
    });

}

// Cosmos watcher
async function syncCosmos(connection: Connection, startHeight: number) {

    console.log(`Start Syncing Cosmos From Block #${startHeight}`)
    const currentHeight = await getCurrentHeight();

    for (var b = startHeight; b <= currentHeight; b++) {

        // console.log("check ", b)
        if (await blockExistsInDB(CosmosBlock, b)) {
            continue;
        }

        const tx_count = await parseBlock(b)

        // Save block in db
        const block = new CosmosBlock();
        block.height = b;
        block.tx_count = tx_count;
        block.parsed_at = new Date();

        // Save new block in db
        await connection.manager.save(block)
    }

}

// Ethereum Watcher
async function syncEthereum(connection: Connection, startHeight: number) {
    console.log(`Start Syncing Ethereum From Block #${startHeight}`)
    const currentHeight = await eth.getCurrentHeight();

    for (var b = startHeight; b <= currentHeight; b++) {

        // console.log("check ", b)
        if (await blockExistsInDB(EthBlock, b)) {
            continue;
        }

        const tx_count = await eth.parseBlock(b)

        // Save block in db
        const block = new EthBlock();
        block.height = b;
        block.tx_count = tx_count;
        block.parsed_at = new Date();

        // Save new block in db
        await connection.manager.save(block)
    }
}

async function blockExistsInDB(entity: any, height: number) {

    const blockRepo = getRepository(entity);
    const dbBlock = await blockRepo.findOne({ height: height });

    return dbBlock != null;
}