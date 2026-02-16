import { BN } from "@coral-xyz/anchor"
import { LAMPORTS_PER_SOL , TOKEN_DECIMALS_FACTOR} from "./constants";

export function calculateSellAmount(tokenAmount: BN, virtualSol: BN, virtualToken: BN): BN
{
    const amount = virtualSol.mul(tokenAmount).div(virtualToken.add(tokenAmount));
    return amount;
}

export function calculateBuyAmount(virtualSol: BN, virtualToken: BN, solAmount: BN): BN
{
    const amount = virtualToken.mul(solAmount).div(virtualSol.add(solAmount));
    return amount;
}

export function getCurrentPrice(virtualSol: BN, virtualTokens: BN): number
{
    return (virtualSol.toNumber() * TOKEN_DECIMALS_FACTOR) / (virtualTokens.toNumber() * LAMPORTS_PER_SOL);
}