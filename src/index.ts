import "reflect-metadata";
import { createConnection } from "typeorm";

import { startBridge } from "./bridge";
import { parseBlock } from "./libraries/cosmos";
import { processQueue } from "./libraries/ethereum";

createConnection().then(async connection => {

    console.log("=======")
    console.log("Ethereum <-> Bitsong Bridge")
    console.log("Staring now...")
    console.log("=======")

    await startBridge(connection);

    // await parseBlock(1022639)

    // await processQueue()

}).catch(error => console.log(error));
