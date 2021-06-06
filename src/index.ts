import "reflect-metadata";
import { createConnection } from "typeorm";
import { CosmosBlock } from "./entity/CosmosBlock";
import { EthBlock } from "./entity/EthBlock";

createConnection().then(async connection => {

    const ethBlocks = await connection.manager.findOne(EthBlock);
    console.log("Ethereum Blocks: ", ethBlocks);

    const cosmosBlocks = await connection.manager.findOne(CosmosBlock);
    console.log("Cosmos Blocks: ", cosmosBlocks);

}).catch(error => console.log(error));
