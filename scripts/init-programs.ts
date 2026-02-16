import { Connection } from "@solana/web3.js";
import { TokenLaunchpadClient } from "../sdk/src";
import { Keypair } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import fs from "fs";
import os from "os";
import { Wallet } from "@coral-xyz/anchor";

const myJson = fs.readFileSync(`${os.homedir()}/.config/solana/id.json`, "utf-8");

const myKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(myJson)));

const connection = new Connection("https://api.devnet.solana.com");
const provider = new AnchorProvider(connection, new Wallet (myKeypair), AnchorProvider.defaultOptions());
const client = new TokenLaunchpadClient(provider);

async function main() 
{
    await client.initialize()
}

main();