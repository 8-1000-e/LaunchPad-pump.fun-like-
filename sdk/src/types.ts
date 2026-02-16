import { BN } from "@coral-xyz/anchor"
import { PublicKey } from "@solana/web3.js";

export interface BondingCurve {
    mint: PublicKey;
    creator: PublicKey;
    virtualSol: BN;
    virtualToken: BN;
    realToken: BN;
    realSolReserves: BN;
    tokenTotalSupply: BN;
    startTime: BN;
    completed: boolean;
    migrated: boolean;
    bump: number;
}

export interface Global {
    authority: PublicKey;
    feeReceiver: PublicKey;
    initialVirtualSolReserves: BN;
    initialVirtualTokenReserves: BN;
    initialRealTokenReserves: BN;
    tokenTotalSupply: BN;
    tokenDecimal: number;
    tradeFeeBps: number;
    creatorShareBps: number;
    referralShareBps: number;
    graduationThreshold: BN;
    status: ProgramStatus;
    bump: number;
}

export type ProgramStatus = 
    | { running: {} }
    | { swapOnly: {} }
    | { paused: {} };

export interface Referral {
    referrer: PublicKey;       // wallet du parrain
    totalEarned: BN;      // total des fees gagnées (en lamports)
    tradeCount: BN;       // nombre de trades référés
    bump: number;
}