import "reflect-metadata";
import { createConnection } from "typeorm";

import { startBridge } from "./bridge";
import { parseBlock } from "./libraries/cosmos";
import { processQueue } from "./libraries/ethereum";

import { setupMetrics } from "./metrics";

createConnection()
  .then(async (connection) => {
    console.log("=======");
    console.log("Ethereum -> Bitsong Bridge");
    console.log("Staring now...");
    console.log("=======");

    // start express server to provide metrics
    setupMetrics();

    // start bridge crons
    await startBridge(connection);

    // await parseBlock(1022639)

    // await processQueue()
  })
  .catch((error) => console.log(error));
