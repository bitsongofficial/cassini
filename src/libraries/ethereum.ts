import { ethers } from "ethers";
import { getRepository } from "typeorm";
import { TxStatus } from "../config";
import { CosmosTx } from "../entity/CosmosTx";
import { checkTxAmounts, isAddress } from "./cosmos";
import { cfg } from "../config"
import { calculateBridgeFee, convertCosmosBalanceToWei, getEthereumTransaction, saveEthereumTransaction } from "./utils";

const ERC20_ABI = [
    "function totalSupply() public view returns (uint256)",
    "function balanceOf(address _who) public view returns (uint256)",
    "function allowance(address _owner, address _spender) public view returns (uint256)",
    "function transfer(address _to, uint256 _value) public returns (bool)",
    "function approve(address _spender, uint256 _value) public returns (bool)",
    "function transferFrom(address _from, address _to, uint256 _value) public returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

const DEPOSIT_ABI = ["event hasBeenAdded(address sender, address recipient, string btsgBech32, uint256 amount, address contractAddress)"]

function setupProvider(): ethers.providers.Provider {
    const provider = new ethers.providers.JsonRpcProvider(cfg.EthereumApi)
    return provider
}

function setupSigner(provider: ethers.providers.Provider): ethers.Signer {
    const signer = ethers.Wallet.fromMnemonic(cfg.EthereumMnemonic).connect(provider)
    return signer
}

function setupTokenContract(readOnly = true) {
    const provider = setupProvider()
    const signer = setupSigner(provider)

    return new ethers.Contract(cfg.EthereumTokenContractAddress, ERC20_ABI, readOnly ? provider : signer);
}

async function queryBalance(address: string) {

    const erc20 = setupTokenContract()

    const bal = await erc20.balanceOf(address)

    return bal;
}

export async function parseBlock(height: number) {
    console.log(`Parsing Ethereum Mainnet Block #${height}...`)
    const provider = setupProvider();

    const contract = new ethers.utils.Interface(DEPOSIT_ABI);

    const filter = {
        address: cfg.EthereumBridgeContractAddress,
        fromBlock: height,
        toBlock: height,
        topics: [cfg.EthereumLogTopics]
    };

    const events = await provider.getLogs(filter)
    const parsedEvents = events.map(log => contract.parseLog(log))

    var count = 0;
    for (let i = 0; i < events.length; i++) {

        const dbTx = await getEthereumTransaction(events[i].transactionHash)

        if (dbTx !== undefined) {
            console.log(`TX ${events[i].transactionHash} already indexed`)
            continue;
        }
        var status = TxStatus.Processing;

        // Check cosmos address
        if (!isAddress(parsedEvents[i].args['btsgBech32'])){
            status = TxStatus.Invalid;
        }

        let data = {
            height,
            amount: ethers.BigNumber.from(parsedEvents[i].args['amount']).toString(),
            from: parsedEvents[i].args['sender'],
            to: parsedEvents[i].args['btsgBech32'],
            hash: events[i].transactionHash,
            status,
        }
        const savedTx = await saveEthereumTransaction(data)
        console.log(`Added tx to queue with id ${savedTx.id} hash: ${savedTx.hash}`)
        count++;
    }

    return count;
}

export async function getCurrentHeight() {

    const provider = setupProvider();
    const block = await provider.getBlockNumber();
    return block;
}

export async function processQueue() {

    const repo = getRepository(CosmosTx)

    const pendingTxs = await repo.find({
        status: TxStatus.Processing
    })

    // Last nonce 
    var nonce = null;
    const lastTx = await repo.findOne({
        order: {
            eth_nonce: "DESC",
        }
    });

    if (lastTx !== undefined) {
        nonce = lastTx.eth_nonce;
    }

    for (let tx of pendingTxs) {

        // Double check onchain data with db data
        const validTx = await checkTxAmounts(tx.hash, tx.amount, tx.from, tx.to);
        if (!validTx) {
            console.error(`ERROR: TX in DB does not match onchain data! ID ${tx.id}`)
            continue
        }

        const erc20 = setupTokenContract(false)

        let txOptions = {
            gasLimit: 80000,
            nonce: nonce + 1,
        }

        const amountToSend = tx.amount - tx.fee;

        const receipt = await erc20.transfer(tx.to, convertCosmosBalanceToWei(amountToSend), txOptions)

        tx.eth_nonce = receipt.nonce;
        tx.eth_hash = receipt.hash;
        tx.migrated_amount = amountToSend;
        tx.status = TxStatus.Completed;
        await repo.save(tx)

        console.log(`Relayed ${tx.amount} from Cosmos to Ethereum. Tx: ${tx.eth_hash}`)
        nonce++;
    }

}