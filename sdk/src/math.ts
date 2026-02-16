import { BN } from "@coral-xyz/anchor"

export function calculateSellAmount(tokenAmount: BN, virtualSol: BN, virtualToken: BN): BN
{
    const amount = virtualSol.mul(tokenAmount).div(virtualToken.add(tokenAmount));
    return amount;
}

export function calculateBuyAmount(virtualSol: BN, virtualToken: BN, solAmount: BN): BN
{
    const amount = virtualToken.mul(solAmount).div(virtualSol.add(solAmount));
    return amount
}

