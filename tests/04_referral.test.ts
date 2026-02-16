import { BN } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  connection,
  clientFor,
  airdrop,
  expectRevert,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "./helpers";
import {
  getFeeVaultPda,
  getReferralPda,
  DEFAULT_TRADE_FEE_BPS,
  DEFAULT_CREATOR_SHARE_BPS,
  DEFAULT_REFERRAL_SHARE_BPS,
} from "./helpers";

describe("04 - Referral", () => {

  describe("register_referral", () => {
    it("should register a referral account", async () => {
      const referrer = Keypair.generate();
      await airdrop(referrer.publicKey, 5 * LAMPORTS_PER_SOL);
      const referrerClient = clientFor(referrer);

      await referrerClient.registerReferral();

      const referralAccount = await referrerClient.getReferral(referrer.publicKey);
      expect(referralAccount.referrer.toBase58()).to.equal(referrer.publicKey.toBase58());
      expect(referralAccount.totalEarned.toNumber()).to.equal(0);
      expect(referralAccount.tradeCount.toNumber()).to.equal(0);
    });

    it("should fail on double registration (PDA already exists)", async () => {
      const referrer = Keypair.generate();
      await airdrop(referrer.publicKey, 5 * LAMPORTS_PER_SOL);
      const referrerClient = clientFor(referrer);

      await referrerClient.registerReferral();

      await expectRevert(
        () => referrerClient.registerReferral(),
        "already in use"
      );
    });
  });

  describe("buy with referral", () => {
    it("should split fees between protocol, creator, and referral", async () => {
      // Setup referrer
      const referrer = Keypair.generate();
      await airdrop(referrer.publicKey, 5 * LAMPORTS_PER_SOL);
      const referrerClient = clientFor(referrer);
      await referrerClient.registerReferral();

      // Create a token
      const creator = Keypair.generate();
      await airdrop(creator.publicKey, 10 * LAMPORTS_PER_SOL);
      const creatorClient = clientFor(creator);
      const mint = await creatorClient.createToken("Ref Token", "REF", "https://example.com/ref.json");

      // Get balances before
      const feeVaultPda = getFeeVaultPda();
      const referralPda = getReferralPda(referrer.publicKey);
      const feeVaultBefore = await connection.getBalance(feeVaultPda);
      const referralBalanceBefore = await connection.getBalance(referralPda);
      const creatorBalanceBefore = await connection.getBalance(creator.publicKey);

      // Buy with referral
      const buyer = Keypair.generate();
      await airdrop(buyer.publicKey, 10 * LAMPORTS_PER_SOL);
      const buyerClient = clientFor(buyer);

      const solAmount = new BN(1 * LAMPORTS_PER_SOL);
      await buyerClient.buyToken(mint, solAmount, new BN(0), referrer.publicKey);

      // Check fee splitting
      const feeVaultAfter = await connection.getBalance(feeVaultPda);
      const referralBalanceAfter = await connection.getBalance(referralPda);
      const creatorBalanceAfter = await connection.getBalance(creator.publicKey);

      // Fee math:
      // totalFee = 1% of 1 SOL = 10_000_000 lamports
      // creatorFee = 65% of totalFee = 6_500_000
      // remaining = 35% = 3_500_000
      // referralFee = 10% of remaining = 350_000
      // protocolFee = remaining - referralFee = 3_150_000
      const totalFee = solAmount.toNumber() * DEFAULT_TRADE_FEE_BPS / 10000;
      const creatorFee = Math.floor(totalFee * DEFAULT_CREATOR_SHARE_BPS / 10000);
      const remainingFee = totalFee - creatorFee;
      const expectedReferralFee = Math.floor(remainingFee * DEFAULT_REFERRAL_SHARE_BPS / 10000);
      const expectedProtocolFee = remainingFee - expectedReferralFee;

      const feeVaultDelta = feeVaultAfter - feeVaultBefore;
      const referralDelta = referralBalanceAfter - referralBalanceBefore;
      const creatorDelta = creatorBalanceAfter - creatorBalanceBefore;

      expect(feeVaultDelta).to.equal(expectedProtocolFee);
      expect(referralDelta).to.equal(expectedReferralFee);
      expect(creatorDelta).to.equal(creatorFee);

      // Verify referral account state updated
      const referralAccount = await referrerClient.getReferral(referrer.publicKey);
      expect(referralAccount.totalEarned.toNumber()).to.equal(expectedReferralFee);
      expect(referralAccount.tradeCount.toNumber()).to.equal(1);
    });
  });

  describe("claim_referral_fees", () => {
    it("should claim accumulated referral fees", async () => {
      const referrer = Keypair.generate();
      await airdrop(referrer.publicKey, 5 * LAMPORTS_PER_SOL);
      const referrerClient = clientFor(referrer);
      await referrerClient.registerReferral();

      // Create token and do a buy with this referral
      const creator = Keypair.generate();
      await airdrop(creator.publicKey, 10 * LAMPORTS_PER_SOL);
      const creatorClient = clientFor(creator);
      const mint = await creatorClient.createToken("Claim Token", "CLM", "https://example.com/clm.json");

      const buyer = Keypair.generate();
      await airdrop(buyer.publicKey, 10 * LAMPORTS_PER_SOL);
      const buyerClient = clientFor(buyer);
      await buyerClient.buyToken(mint, new BN(1 * LAMPORTS_PER_SOL), new BN(0), referrer.publicKey);

      // Now claim the fees
      const referrerBalanceBefore = await connection.getBalance(referrer.publicKey);

      await referrerClient.claimReferralFees();

      const referrerBalanceAfter = await connection.getBalance(referrer.publicKey);
      expect(referrerBalanceAfter).to.be.greaterThan(referrerBalanceBefore - 10000);
    });

    it("should fail when claimed by non-referrer", async () => {
      const referrer = Keypair.generate();
      await airdrop(referrer.publicKey, 5 * LAMPORTS_PER_SOL);
      const referrerClient = clientFor(referrer);
      await referrerClient.registerReferral();

      // Attacker calls claimReferralFees — their PDA doesn't exist
      const attacker = Keypair.generate();
      await airdrop(attacker.publicKey, 2 * LAMPORTS_PER_SOL);
      const attackerClient = clientFor(attacker);

      await expectRevert(
        () => attackerClient.claimReferralFees(),
        "AccountNotInitialized"
      );
    });
  });
});
