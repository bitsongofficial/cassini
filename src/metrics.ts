import * as express from "express";
import { getRepository } from "typeorm";
import { CosmosBlock } from "./entity/CosmosBlock";
import { EthBlock } from "./entity/EthBlock";
import { CosmosTx } from "./entity/CosmosTx";
import { cfg, TxStatus } from "./config";
import { EthereumTx } from "./entity/EthereumTx";

export function setupMetrics() {
  const app = express();

  app.get("/", async (req, res) => {
    res.json({
      success: true,
    });
  });

  // get cosmos last sync block
  app.get("/cosmos", async (req, res) => {
    const cosmosBlocksRepository = getRepository(CosmosBlock);
    const lastBlock = await cosmosBlocksRepository.findOne({
      order: {
        height: "DESC",
      },
    });

    let response = {};

    if (!lastBlock) {
      response = {
        success: false,
        message: "No blocks found",
      };
    } else {
      response = {
        success: true,
        data: lastBlock,
      };
    }

    res.json(response);
  });

  // get ethereum last sync block
  app.get("/ethereum", async (req, res) => {
    const cosmosBlocksRepository = getRepository(EthBlock);
    const lastBlock = await cosmosBlocksRepository.findOne({
      order: {
        height: "DESC",
      },
    });

    let response = {};

    if (!lastBlock) {
      response = {
        success: false,
        message: "No blocks found",
      };
    } else {
      response = {
        success: true,
        data: lastBlock,
      };
    }

    res.json(response);
  });

  // get pending cosmos->ethereum tx
  app.get("/cosmos/pending", async (req, res) => {
    const txRepo = getRepository(CosmosTx);

    const pendingTxs = await txRepo.find({
      status: TxStatus.Processing,
    });

    let response = {};

    if (!pendingTxs || pendingTxs.length === 0) {
      response = {
        success: false,
        message: "No txs found",
      };
    } else {
      response = {
        success: true,
        data: pendingTxs,
      };
    }

    res.json(response);
  });

  // get pending ethereum->cosmos tx
  app.get("/ethereum/pending", async (req, res) => {
    const txRepo = getRepository(EthereumTx);

    const pendingTxs = await txRepo.find({
      status: TxStatus.Processing,
    });

    let response = {};

    if (!pendingTxs || pendingTxs.length === 0) {
      response = {
        success: false,
        message: "No txs found",
      };
    } else {
      response = {
        success: true,
        data: pendingTxs,
      };
    }

    res.json(response);
  });

  // get ethereum->cosmos tx detail
  app.get("/ethereum/tx/:hash", async (req, res) => {
    const txRepo = getRepository(EthereumTx);

    const tx = await txRepo.findOne({
      hash: req.params.hash,
    });

    let response = {};

    if (tx === undefined) {
      response = {
        success: false,
        message: "No tx found",
      };
    } else {
      response = {
        success: true,
        data: tx,
      };
    }

    res.json(response);
  });

  // get ethereum->cosmos txs by from address
  app.get("/ethereum/from/:from", async (req, res) => {
    const txRepo = getRepository(EthereumTx);

    const txs = await txRepo.find({
      where: {
        from: req.params.from,
      },
      order: {
        id: "DESC",
      },
      take: 50,
    });

    let response = {};

    if (!txs || txs.length === 0) {
      response = {
        success: false,
        message: "No txs found",
      };
    } else {
      response = {
        success: true,
        data: txs,
      };
    }

    res.json(response);
  });

  app.listen(cfg.MetricsPort, cfg.MetricsHost, () => {
    console.log(
      `Cassini API server on http://${cfg.MetricsHost}:${cfg.MetricsPort}`
    );
  });
}
