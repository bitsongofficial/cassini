import * as dotenv from 'dotenv';

// Setup env
dotenv.config();

export const cfg = {
    CosmosWatchInterval: parseInt(process.env.COSMOS_WATCH_INTERVAL),
    EtheruemWatchInterval: parseInt(process.env.ETHEREUM_WATCH_INTERVAL),
    EthereumSendingInterval: parseInt(process.env.ETHEREUM_SEND_INTERVAL),
    CosmosSendingInterval: parseInt(process.env.COSMOS_SEND_INTERVAL),

    CosmosApi: process.env.COSMOS_MAINNET_API,
    CosmosBridgeAddress: process.env.COSMOS_BRIDGE_ADDRESS,
    CosmosMnemonic: process.env.COSMOS_MNEMONIC,
    CosmosGasPrice: process.env.COSMOS_GAS_PRICE,
    CosmosDenom: process.env.COSMOS_DENOM,
    CosmosStartHeight: parseInt(process.env.COSMOS_START_HEIGHT),

    EthereumApi: process.env.ETH_API,
    EthereumMnemonic: process.env.ETHEREUM_MNEMONIC,
    EthereumTokenContractAddress: process.env.ETHEREUM_TOKEN_CONTRACT_ADDRESS,
    EthereumBridgeContractAddress: process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS,
    EthereumLogTopics: process.env.ETHEREUM_LOG_TOPICS,
    EthereumStartHeight: parseInt(process.env.ETHREUM_STARAT_HEIGHT),

    BridgeMinFee: parseInt(process.env.BRIDGE_MIN_FEE),
    BridgeFeePercent: parseFloat(process.env.BRIDGE_FEE_PERCENT)
}

export enum TxStatus {
    Error = "Error",
    Processing = "Processing",
    Invalid = "Invalid",
    Completed = "Completed"
}