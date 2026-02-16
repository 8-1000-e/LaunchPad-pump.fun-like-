import { BN } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  connection,
  adminClient,
  clientFor,
  airdrop,
  expectRevert,
  Keypair,
  LAMPORTS_PER_SOL,
  getAssociatedTokenAddress,
} from "./helpers";
import {
  getBondingCurvePda,
  DEFAULT_VIRTUAL_SOL,
  DEFAULT_VIRTUAL_TOKENS,
  DEFAULT_REAL_TOKENS,
  DEFAULT_TOKEN_SUPPLY,
} from "./helpers";

describe("02 - Launch", () => {

  describe("create_token", () => {
    it("should create a token with correct bonding curve state", async () => {
      const creator = Keypair.generate();
      await airdrop(creator.publicKey, 10 * LAMPORTS_PER_SOL);

      const creatorClient = clientFor(creator);
      const mint = await creatorClient.createToken("My Token", "MTK", "https://example.com/mtk.json");

      const bc = await creatorClient.getBondingCurve(mint);
      expect(bc.mint.toBase58()).to.equal(mint.toBase58());
      expect(bc.creator.toBase58()).to.equal(creator.publicKey.toBase58());
      expect(bc.virtualSol.toString()).to.equal(DEFAULT_VIRTUAL_SOL.toString());
      expect(bc.virtualToken.toString()).to.equal(DEFAULT_VIRTUAL_TOKENS.toString());
      expect(bc.realToken.toString()).to.equal(DEFAULT_REAL_TOKENS.toString());
      expect(bc.realSolReserves.toNumber()).to.equal(0);
      expect(bc.tokenTotalSupply.toString()).to.equal(DEFAULT_TOKEN_SUPPLY.toString());
      expect(bc.completed).to.be.false;
      expect(bc.migrated).to.be.false;

      // Verify token supply was minted to the bonding curve's token account
      const bondingCurvePda = getBondingCurvePda(mint);
      const tokenAccount = await getAssociatedTokenAddress(mint, bondingCurvePda, true);
      const tokenBalance = await connection.getTokenAccountBalance(tokenAccount);
      expect(tokenBalance.value.amount).to.equal(DEFAULT_TOKEN_SUPPLY.toString());
    });

    it("should fail to create token when program is paused", async () => {
      // Pause via admin
      await adminClient.updateConfig({ newStatus: { paused: {} } });

      const creator = Keypair.generate();
      await airdrop(creator.publicKey, 10 * LAMPORTS_PER_SOL);
      const creatorClient = clientFor(creator);

      try {
        await expectRevert(
          () => creatorClient.createToken("Paused Token", "PAUSE", "https://example.com/pause.json"),
          "ProgramPaused"
        );
      } finally {
        await adminClient.updateConfig({ newStatus: { running: {} } });
      }
    });
  });

  describe("create_and_buy_token", () => {
    it("should create token and execute initial buy", async () => {
      const creator = Keypair.generate();
      await airdrop(creator.publicKey, 20 * LAMPORTS_PER_SOL);

      const creatorClient = clientFor(creator);
      const solAmount = new BN(1 * LAMPORTS_PER_SOL);
      const mint = await creatorClient.createAndBuyToken("Buy Token", "BUY", "https://example.com/buy.json", solAmount, new BN(0));

      // Verify bonding curve was updated
      const bc = await creatorClient.getBondingCurve(mint);
      expect(bc.realSolReserves.toNumber()).to.be.greaterThan(0);
      expect(bc.completed).to.be.false;

      // Verify creator received tokens
      const creatorTokenAccount = await getAssociatedTokenAddress(mint, creator.publicKey);
      const creatorBalance = await connection.getTokenAccountBalance(creatorTokenAccount);
      expect(Number(creatorBalance.value.amount)).to.be.greaterThan(0);
    });

    it("should fail with sol_amount=0", async () => {
      const creator = Keypair.generate();
      await airdrop(creator.publicKey, 10 * LAMPORTS_PER_SOL);
      const creatorClient = clientFor(creator);

      await expectRevert(
        () => creatorClient.createAndBuyToken("Zero Token", "ZERO", "https://example.com/zero.json", new BN(0), new BN(0)),
        "ZeroAmount"
      );
    });
  });
});
