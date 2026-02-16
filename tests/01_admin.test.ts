import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  provider,
  connection,
  authority,
  adminClient,
  clientFor,
  airdrop,
  expectRevert,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "./helpers";
import {
  getGlobalPda,
  getFeeVaultPda,
  DEFAULT_VIRTUAL_SOL,
  DEFAULT_VIRTUAL_TOKENS,
  DEFAULT_REAL_TOKENS,
  DEFAULT_TOKEN_SUPPLY,
  DEFAULT_TRADE_FEE_BPS,
  DEFAULT_CREATOR_SHARE_BPS,
  DEFAULT_REFERRAL_SHARE_BPS,
  DEFAULT_GRADUATION_THRESHOLD,
} from "./helpers";

describe("01 - Admin", () => {
  const globalPda = getGlobalPda();
  const feeVaultPda = getFeeVaultPda();

  describe("initialize", () => {
    it("should initialize global config with default values", async () => {
      await adminClient.initialize();

      const global = await adminClient.getGlobal();

      expect(global.authority.toBase58()).to.equal(authority.publicKey.toBase58());
      expect(global.feeReceiver.toBase58()).to.equal(authority.publicKey.toBase58());
      expect(global.initialVirtualSolReserves.toString()).to.equal(DEFAULT_VIRTUAL_SOL.toString());
      expect(global.initialVirtualTokenReserves.toString()).to.equal(DEFAULT_VIRTUAL_TOKENS.toString());
      expect(global.initialRealTokenReserves.toString()).to.equal(DEFAULT_REAL_TOKENS.toString());
      expect(global.tokenTotalSupply.toString()).to.equal(DEFAULT_TOKEN_SUPPLY.toString());
      expect(global.tokenDecimal).to.equal(6);
      expect(global.tradeFeeBps).to.equal(DEFAULT_TRADE_FEE_BPS);
      expect(global.creatorShareBps).to.equal(DEFAULT_CREATOR_SHARE_BPS);
      expect(global.referralShareBps).to.equal(DEFAULT_REFERRAL_SHARE_BPS);
      expect(global.graduationThreshold.toString()).to.equal(DEFAULT_GRADUATION_THRESHOLD.toString());
      expect(global.status).to.deep.equal({ running: {} });
    });

    it("should fail on double initialization (PDA already exists)", async () => {
      await expectRevert(() => adminClient.initialize(), "already in use");
    });
  });

  describe("update_config", () => {
    it("should update config fields as authority", async () => {
      const newFeeReceiver = Keypair.generate().publicKey;
      const newThreshold = new BN(100 * LAMPORTS_PER_SOL);

      await adminClient.updateConfig({
        newFeeReceiver,
        newTradeFeeBps: 200,
        newGraduationThreshold: newThreshold,
      });

      const global = await adminClient.getGlobal();
      expect(global.feeReceiver.toBase58()).to.equal(newFeeReceiver.toBase58());
      expect(global.tradeFeeBps).to.equal(200);
      expect(global.graduationThreshold.toString()).to.equal(newThreshold.toString());

      // Restore defaults
      await adminClient.updateConfig({
        newFeeReceiver: authority.publicKey,
        newInitialVirtualSolReserves: DEFAULT_VIRTUAL_SOL,
        newInitialVirtualTokenReserves: DEFAULT_VIRTUAL_TOKENS,
        newInitialRealTokenReserves: DEFAULT_REAL_TOKENS,
        newTokenTotalSupply: DEFAULT_TOKEN_SUPPLY,
        newTradeFeeBps: DEFAULT_TRADE_FEE_BPS,
        newCreatorShareBps: DEFAULT_CREATOR_SHARE_BPS,
        newReferralShareBps: DEFAULT_REFERRAL_SHARE_BPS,
        newGraduationThreshold: DEFAULT_GRADUATION_THRESHOLD,
        newStatus: { running: {} },
      });
    });

    it("should fail when called by non-authority", async () => {
      const attacker = Keypair.generate();
      await airdrop(attacker.publicKey, 2 * LAMPORTS_PER_SOL);
      const attackerClient = clientFor(attacker);

      await expectRevert(
        () => attackerClient.updateConfig({ newStatus: { paused: {} } }),
        "ConstraintHasOne"
      );
    });
  });

  describe("withdraw_fees", () => {
    it("should withdraw fees to the configured fee_receiver", async () => {
      const fundAmount = 5 * LAMPORTS_PER_SOL;
      const transferIx = SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: feeVaultPda,
        lamports: fundAmount,
      });
      const tx = new anchor.web3.Transaction().add(transferIx);
      await provider.sendAndConfirm(tx);

      const feeVaultBefore = await connection.getBalance(feeVaultPda);
      const recipientBefore = await connection.getBalance(authority.publicKey);

      await adminClient.withdrawFees();

      const feeVaultAfter = await connection.getBalance(feeVaultPda);
      const recipientAfter = await connection.getBalance(authority.publicKey);

      expect(feeVaultAfter).to.be.lessThan(feeVaultBefore);
      expect(recipientAfter).to.be.greaterThan(recipientBefore - 100000);
    });

    it("should fail when called by non-authority", async () => {
      const attacker = Keypair.generate();
      await airdrop(attacker.publicKey, 2 * LAMPORTS_PER_SOL);
      const attackerClient = clientFor(attacker);

      await expectRevert(
        () => attackerClient.withdrawFees(),
        "ConstraintHasOne"
      );
    });
  });
});
