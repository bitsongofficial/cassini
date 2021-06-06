import * as dotenv from 'dotenv';

// Setup env
dotenv.config();

export const cfg = {
    CosmosWatchInterval: parseInt(process.env.COSMOS_WATCH_INTERVAL),
    EtheruemWatchInterval: parseInt(process.env.ETHEREUM_WATCH_INTERVAL),
    EthereumSendingInterval: parseInt(process.env.ETHEREUM_SEND_INTERVAL),

    CosmosApi: process.env.COSMOS_MAINNET_API,
    CosmosBridgeAddress: process.env.COSMOS_BRIDGE_ADDRESS,
    CosmosBitsongDenom: process.env.COSMOS_BITSONG_DENOM,

    EthereumApi: process.env.ETH_API,
    EthereumMnemonic: process.env.ETHEREUM_MNEMONIC,
    EthereumTokenContractAddress: process.env.ETHEREUM_TOKEN_CONTRACT_ADDRESS,
    EthereumBridgeContractAddress: process.env.ETHEREUM_BRIDGE_CONTRACT_ADDRESS,

    BridgeMinFee: parseInt(process.env.BRIDGE_MIN_FEE),
    BridgeFeePercent: parseFloat(process.env.BRIDGE_FEE_PERCENT)
}

export enum TxStatus {
    Error = "Error",
    Processing = "Processing",
    Invalid = "Invalid",
    Completed = "Completed"
}