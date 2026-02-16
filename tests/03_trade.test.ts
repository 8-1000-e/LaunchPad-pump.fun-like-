import { BN } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  connection,
  adminClient,
  clientFor,
  airdrop,
  expectRevert,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  getAssociatedTokenAddress,
} from "./helpers";
import {
  DEFAULT_GRADUATION_THRESHOLD,
  calculateBuyAmount,
} from "./helpers";

describe("03 - Trade", () => {
  let testMint: PublicKey;
  let creatorKeypair: Keypair;

  // Create a shared token for trade tests
  before(async () => {
    creatorKeypair = Keypair.generate();
    await airdrop(creatorKeypair.publicKey, 20 * LAMPORTS_PER_SOL);
    const creatorClient = clientFor(creatorKeypair);
    testMint = await creatorClient.createToken("Trade Token", "TRD", "https://example.com/trd.json");
  });

  describe("buy_token", () => {
    it("should buy tokens and update reserves correctly", async () => {
      const buyer = Keypair.generate();
      await airdrop(buyer.publicKey, 20 * LAMPORTS_PER_SOL);
      const buyerClient = clientFor(buyer);

      const bcBefore = await buyerClient.getBondingCurve(testMint);
      const solAmount = new BN(1 * LAMPORTS_PER_SOL);

      await buyerClient.buyToken(testMint, solAmount, new BN(0));

      const bcAfter = await buyerClient.getBondingCurve(testMint);

      // After fee (1%), net SOL = 0.99 SOL
      const fee = solAmount.toNumber() * 100 / 10000;
      const solAfterFee = solAmount.toNumber() - fee;

      expect(bcAfter.virtualSol.toNumber()).to.equal(bcBefore.virtualSol.toNumber() + solAfterFee);
      expect(bcAfter.realSolReserves.toNumber()).to.equal(bcBefore.realSolReserves.toNumber() + solAfterFee);
      expect(bcAfter.virtualToken.toNumber()).to.be.lessThan(bcBefore.virtualToken.toNumber());
      expect(bcAfter.realToken.toNumber()).to.be.lessThan(bcBefore.realToken.toNumber());

      // Verify buyer got tokens
      const buyerAta = await getAssociatedTokenAddress(testMint, buyer.publicKey);
      const balance = await connection.getTokenAccountBalance(buyerAta);
      expect(Number(balance.value.amount)).to.be.greaterThan(0);
    });

    it("should fail with amount=0", async () => {
      const buyer = Keypair.generate();
      await airdrop(buyer.publicKey, 5 * LAMPORTS_PER_SOL);
      const buyerClient = clientFor(buyer);

      await expectRevert(
        () => buyerClient.buyToken(testMint, new BN(0), new BN(0)),
        "ZeroAmount"
      );
    });

    it("should fail when program is paused", async () => {
      await adminClient.updateConfig({ newStatus: { paused: {} } });

      const buyer = Keypair.generate();
      await airdrop(buyer.publicKey, 5 * LAMPORTS_PER_SOL);
      const buyerClient = clientFor(buyer);

      try {
        await expectRevert(
          () => buyerClient.buyToken(testMint, new BN(LAMPORTS_PER_SOL), new BN(0)),
          "ProgramPaused"
        );
      } finally {
        await adminClient.updateConfig({ newStatus: { running: {} } });
      }
    });

    it("should fail with slippage too high (min_tokens_out unreachable)", async () => {
      const buyer = Keypair.generate();
      await airdrop(buyer.publicKey, 5 * LAMPORTS_PER_SOL);
      const buyerClient = clientFor(buyer);

      await expectRevert(
        () => buyerClient.buyToken(testMint, new BN(LAMPORTS_PER_SOL), new BN("999999999999999999")),
        "SlippageExceeded"
      );
    });

    it("should match SDK math for tokens received", async () => {
      const buyer = Keypair.generate();
      await airdrop(buyer.publicKey, 20 * LAMPORTS_PER_SOL);
      const buyerClient = clientFor(buyer);

      const bc = await buyerClient.getBondingCurve(testMint);
      const solAmount = new BN(1 * LAMPORTS_PER_SOL);
      const fee = solAmount.toNumber() * 100 / 10000;
      const solAfterFee = new BN(solAmount.toNumber() - fee);

      // SDK math prediction
      const expectedTokens = calculateBuyAmount(bc.virtualSol, bc.virtualToken, solAfterFee);

      await buyerClient.buyToken(testMint, solAmount, new BN(0));

      const buyerAta = await getAssociatedTokenAddress(testMint, buyer.publicKey);
      const actualTokens = new BN((await connection.getTokenAccountBalance(buyerAta)).value.amount);

      expect(actualTokens.toString()).to.equal(expectedTokens.toString());
    });
  });

  describe("sell_token", () => {
    let seller: Keypair;
    let sellerClient: any;
    let sellerTokens: BN;

    before(async () => {
      seller = Keypair.generate();
      await airdrop(seller.publicKey, 20 * LAMPORTS_PER_SOL);
      sellerClient = clientFor(seller);

      await sellerClient.buyToken(testMint, new BN(2 * LAMPORTS_PER_SOL), new BN(0));

      const sellerAta = await getAssociatedTokenAddress(testMint, seller.publicKey);
      const balance = await connection.getTokenAccountBalance(sellerAta);
      sellerTokens = new BN(balance.value.amount);
    });

    it("should sell tokens and receive SOL", async () => {
      const sellAmount = sellerTokens.div(new BN(2));
      const sellerBalanceBefore = await connection.getBalance(seller.publicKey);

      await sellerClient.sellToken(testMint, sellAmount, new BN(0));

      const sellerBalanceAfter = await connection.getBalance(seller.publicKey);
      expect(sellerBalanceAfter).to.be.greaterThan(sellerBalanceBefore - 10000);

      const sellerAta = await getAssociatedTokenAddress(testMint, seller.publicKey);
      const balanceAfter = await connection.getTokenAccountBalance(sellerAta);
      expect(Number(balanceAfter.value.amount)).to.be.lessThan(sellerTokens.toNumber());
    });

    it("should fail with amount=0", async () => {
      await expectRevert(
        () => sellerClient.sellToken(testMint, new BN(0), new BN(0)),
        "ZeroAmount"
      );
    });

    it("should fail when program is paused", async () => {
      await adminClient.updateConfig({ newStatus: { paused: {} } });

      try {
        await expectRevert(
          () => sellerClient.sellToken(testMint, new BN(1000000), new BN(0)),
          "ProgramPaused"
        );
      } finally {
        await adminClient.updateConfig({ newStatus: { running: {} } });
      }
    });

    it("should fail with slippage too high (min_sol_out unreachable)", async () => {
      await expectRevert(
        () => sellerClient.sellToken(testMint, new BN(1000000), new BN("999999999999999999")),
        "SlippageExceeded"
      );
    });
  });

  describe("buy/sell round-trip", () => {
    it("should complete a full buy/sell round-trip", async () => {
      const creator = Keypair.generate();
      await airdrop(creator.publicKey, 20 * LAMPORTS_PER_SOL);
      const creatorClient = clientFor(creator);

      const mint = await creatorClient.createToken("Round Trip Token", "RND", "https://example.com/rnd.json");

      const trader = Keypair.generate();
      await airdrop(trader.publicKey, 20 * LAMPORTS_PER_SOL);
      const traderClient = clientFor(trader);

      const solBefore = await connection.getBalance(trader.publicKey);

      // Buy
      await traderClient.buyToken(mint, new BN(1 * LAMPORTS_PER_SOL), new BN(0));

      // Get tokens received
      const traderAta = await getAssociatedTokenAddress(mint, trader.publicKey);
      const tokensReceived = (await connection.getTokenAccountBalance(traderAta)).value.amount;
      expect(Number(tokensReceived)).to.be.greaterThan(0);

      // Sell all tokens back
      await traderClient.sellToken(mint, new BN(tokensReceived), new BN(0));

      // Verify tokens are gone
      const tokensAfter = (await connection.getTokenAccountBalance(traderAta)).value.amount;
      expect(Number(tokensAfter)).to.equal(0);

      // SOL should be less than before (fees taken on both buy and sell)
      const solAfter = await connection.getBalance(trader.publicKey);
      expect(solAfter).to.be.lessThan(solBefore);
    });
  });

  describe("graduation", () => {
    it("should mark curve as completed when threshold is reached", async () => {
      // Set a very low graduation threshold (2 SOL)
      const lowThreshold = new BN(2 * LAMPORTS_PER_SOL);
      await adminClient.updateConfig({ newGraduationThreshold: lowThreshold });

      const creator = Keypair.generate();
      await airdrop(creator.publicKey, 20 * LAMPORTS_PER_SOL);
      const creatorClient = clientFor(creator);
      const mint = await creatorClient.createToken("Grad Token", "GRAD", "https://example.com/grad.json");

      const buyer = Keypair.generate();
      await airdrop(buyer.publicKey, 50 * LAMPORTS_PER_SOL);
      const buyerClient = clientFor(buyer);

      await buyerClient.buyToken(mint, new BN(3 * LAMPORTS_PER_SOL), new BN(0));

      const bc = await buyerClient.getBondingCurve(mint);
      expect(bc.completed).to.be.true;

      // Restore threshold
      await adminClient.updateConfig({ newGraduationThreshold: DEFAULT_GRADUATION_THRESHOLD });
    });

    it("should fail to buy on completed curve", async () => {
      const lowThreshold = new BN(2 * LAMPORTS_PER_SOL);
      await adminClient.updateConfig({ newGraduationThreshold: lowThreshold });

      const creator = Keypair.generate();
      await airdrop(creator.publicKey, 20 * LAMPORTS_PER_SOL);
      const creatorClient = clientFor(creator);
      const mint = await creatorClient.createToken("Complete Token", "COMP", "https://example.com/comp.json");

      const buyer = Keypair.generate();
      await airdrop(buyer.publicKey, 50 * LAMPORTS_PER_SOL);
      const buyerClient = clientFor(buyer);

      // First buy to complete the curve
      await buyerClient.buyToken(mint, new BN(3 * LAMPORTS_PER_SOL), new BN(0));

      const bc = await buyerClient.getBondingCurve(mint);
      expect(bc.completed).to.be.true;

      // Try to buy again - should fail
      const buyer2 = Keypair.generate();
      await airdrop(buyer2.publicKey, 10 * LAMPORTS_PER_SOL);
      const buyer2Client = clientFor(buyer2);

      await expectRevert(
        () => buyer2Client.buyToken(mint, new BN(LAMPORTS_PER_SOL), new BN(0)),
        "CurveCompleted"
      );

      await adminClient.updateConfig({ newGraduationThreshold: DEFAULT_GRADUATION_THRESHOLD });
    });

    it("should fail to sell on completed curve", async () => {
      const lowThreshold = new BN(2 * LAMPORTS_PER_SOL);
      await adminClient.updateConfig({ newGraduationThreshold: lowThreshold });

      const creator = Keypair.generate();
      await airdrop(creator.publicKey, 20 * LAMPORTS_PER_SOL);
      const creatorClient = clientFor(creator);
      const mint = await creatorClient.createToken("Sell Complete Token", "SCOMP", "https://example.com/scomp.json");

      const buyer = Keypair.generate();
      await airdrop(buyer.publicKey, 50 * LAMPORTS_PER_SOL);
      const buyerClient = clientFor(buyer);

      await buyerClient.buyToken(mint, new BN(3 * LAMPORTS_PER_SOL), new BN(0));

      const bc = await buyerClient.getBondingCurve(mint);
      expect(bc.completed).to.be.true;

      // Try to sell - should fail
      const buyerAta = await getAssociatedTokenAddress(mint, buyer.publicKey);
      const tokensHeld = (await connection.getTokenAccountBalance(buyerAta)).value.amount;

      await expectRevert(
        () => buyerClient.sellToken(mint, new BN(tokensHeld), new BN(0)),
        "CurveCompleted"
      );

      await adminClient.updateConfig({ newGraduationThreshold: DEFAULT_GRADUATION_THRESHOLD });
    });
  });
});
