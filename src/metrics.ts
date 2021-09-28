
import * as express from "express";
import { getRepository } from "typeorm";
import { CosmosBlock } from "./entity/CosmosBlock";
import { EthBlock } from "./entity/EthBlock";
import { CosmosTx } from "./entity/CosmosTx";
import { TxStatus } from "./config";
import { EthereumTx } from "./entity/EthereumTx";

export function setupMetrics() {
  const app = express();

  app.get('/', async (req, res) => {
    res.send('Cassini metrics')
  })

  // get cosmos last sync block
  app.get('/cosmos', async (req, res) => {

    const cosmosBlocksRepository = getRepository(CosmosBlock);
    const lastBlock = await cosmosBlocksRepository.findOne({
        order: {
            height: "DESC",
        }
    })

    let response = {}

    if (!lastBlock) {
      response = {
        success: false,
        message: 'No blocks found'
      }
    } else {
      response = {
        success: true,
        data: lastBlock
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response))
  })

  // get ethereum last sync block
  app.get('/ethereum', async (req, res) => {

    const cosmosBlocksRepository = getRepository(EthBlock);
    const lastBlock = await cosmosBlocksRepository.findOne({
        order: {
            height: "DESC",
        }
    })

    let response = {}

    if (!lastBlock) {
      response = {
        success: false,
        message: 'No blocks found'
      }
    } else {
      response = {
        success: true,
        data: lastBlock
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response))
  })

  // get pending cosmos->ethereum tx
  app.get('/cosmos/pending', async (req, res) => {
    const txRepo = getRepository(CosmosTx);

    const pendingTxs = await txRepo.find({
      status: TxStatus.Processing
  })

    let response = {}

    if (!pendingTxs || pendingTxs.length === 0) {
      response = {
        success: false,
        message: 'No txs found'
      }
    } else {
      response = {
        success: true,
        data: pendingTxs
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response))
  });

  // get pending ethereum->cosmos tx
  app.get('/ethereum/pending', async (req, res) => {
    const txRepo = getRepository(EthereumTx);

    const pendingTxs = await txRepo.find({
      status: TxStatus.Processing
  })

    let response = {}

    if (!pendingTxs || pendingTxs.length === 0) {
      response = {
        success: false,
        message: 'No txs found'
      }
    } else {
      response = {
        success: true,
        data: pendingTxs
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(response))
  });


  app.listen(3000, () => {
      console.log("Metrics listening on http://127.0.0.1:3000")
  });
}