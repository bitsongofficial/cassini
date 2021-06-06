import * as dotenv from 'dotenv';

// Setup env
dotenv.config();

export const cfg = {
    CosmosWatchInterval: parseInt(process.env.COSMOS_WATCH_INTERVAL),
    EtheruemWatchInterval: parseInt(process.env.ETHEREUM_WATCH_INTERVAL),

    CosmosApi: process.env.COSMOS_MAINNET_API,
    CosmosBridgeAddress: process.env.COSMOS_BRIDGE_ADDRESS,
    CosmosBitsongDenom: process.env.COSMOS_BITSONG_DENOM,

    BridgeMinFee: parseInt(process.env.BRIDGE_MIN_FEE),
    BridgeFeePercent: parseFloat(process.env.BRIDGE_FEE_PERCENT)
}

export enum TxStatus {
    Error = "Error",
    Processing = "Processing",
    Invalid = "Invalid",
    Completed = "Completed"
}