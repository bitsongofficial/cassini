import * as dotenv from 'dotenv';

// Setup env
dotenv.config();

export default {
    CosmosWatchInterval: parseInt(process.env.COSMOS_WATCH_INTERVAL),
    EtheruemWatchInterval: parseInt(process.env.ETHEREUM_WATCH_INTERVAL),
}