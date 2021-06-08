import { Connection } from "typeorm";
import { CosmosBlock } from "./entity/CosmosBlock";
import { EthBlock } from "./entity/EthBlock";

import { cfg } from "./config"

import { getRepository } from "typeorm";
import { getCurrentHeight, parseBlock } from "./libraries/cosmos";
import { processQueue } from "./libraries/ethereum";


export async function startBridge(connection: Connection) {

    var syncing = false;

    // Start Cosmos Blocks Parsing
    setInterval(async () => {
        if (syncing) {
            return;
        }

        console.log("Querying cosmos...")

        syncing = true;
        const cosmosBlocksRepository = getRepository(CosmosBlock);
        const lastBlock = await cosmosBlocksRepository.findOne({
            order: {
                height: "DESC",
            }
        })

        const lastHeight = lastBlock ? lastBlock.height : 0;
        await syncCosmos(connection, lastHeight)
        syncing = false;

    }, cfg.CosmosWatchInterval)

    // Start Ethereum Blocks Parsing
    setInterval(async () => {
        console.log("Querying Ethereum...")

        const ethBlocksRepository = getRepository(EthBlock);
        const lastBlock = await ethBlocksRepository.findOne({
            order: {
                height: "DESC",
            }
        })

        const lastHeight = lastBlock ? lastBlock.height : 0;
        await syncEthereum(connection, lastHeight)

    }, cfg.EtheruemWatchInterval)


    // Start Ethereum Transaction Sending
    setInterval(async () => {
        console.log("Sending pending Ethereum txs...")

        await processQueue();
    }, cfg.EthereumSendingInterval)

}


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


async function syncEthereum(connection: Connection, startHeight: number) {

}

async function blockExistsInDB(entity: any, height: number) {

    const blockRepo = getRepository(entity);
    const dbBlock = await blockRepo.findOne({ height: height });

    return dbBlock != null;
}