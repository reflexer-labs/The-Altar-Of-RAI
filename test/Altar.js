const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Altar", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function fixuture() {
    const Sablier = await ethers.getContractFactory("Sablier");
    const sablier = await Sablier.deploy();

    const LIT = await ethers.getContractFactory("LIT");
    const lit = await LIT.deploy();

    const FLX = await ethers.getContractFactory("FLX");
    const flx = await FLX.deploy();

    const Altar = await ethers.getContractFactory("Altar");
    const altar = await Altar.deploy(sablier.address, lit.address, flx.address);

    const AltarTreasury = await ethers.getContractFactory("AltarTreasury");
    const altarTreasury = await AltarTreasury.deploy(
      sablier.address,
      lit.address
    );

    await altar.setTreasury(altarTreasury.address);

    const litBalance = 5 * 1000 * 1000;
    const periode = 1000;

    await lit.mint(altarTreasury.address, litBalance);

    return { sablier, lit, flx, altar, altarTreasury, litBalance, periode };
  }

  async function startedStreamFixture() {
    const fixtureObj = await fixuture();
    const { altarTreasury, periode, altar } = fixtureObj;
    await altarTreasury.startStream(periode, altar.address);

    const streamId = await altarTreasury.streamId();

    return { ...fixtureObj, streamId };
  }

  describe("Deployment", function () {
    it("Sablier should exist", async function () {
      const { sablier } = await loadFixture(fixuture);
      expect(sablier.address).to.exist;
    });

    it("LIT should exist", async function () {
      const { lit } = await loadFixture(fixuture);
      expect(lit.address).to.exist;
    });

    it("FLX should exist", async function () {
      const { flx } = await loadFixture(fixuture);
      expect(flx.address).to.exist;
    });

    it("Altar Treasury must have proper addresses setted", async function () {
      const { altarTreasury, sablier, flx, lit } = await loadFixture(fixuture);
      expect(altarTreasury.address).to.exist;

      expect(await altarTreasury.lit()).to.equal(lit.address);
      expect(await altarTreasury.sablier()).to.equal(sablier.address);
    });

    it("Altar must have proper addresses setted", async function () {
      const { altar, sablier, flx, lit } = await loadFixture(fixuture);
      expect(altar.address).to.exist;

      expect(await altar.lit()).to.equal(lit.address);
      expect(await altar.sablier()).to.equal(sablier.address);
      expect(await altar.flx()).to.equal(flx.address);
    });

    it("Altar must have proper treasury address", async function () {
      const { altar, altarTreasury } = await loadFixture(fixuture);
      expect(await altar.treasury()).to.equal(altarTreasury.address);
      await expect(altar.setTreasury(altarTreasury.address)).to.be.revertedWith(
        "already setted"
      );
    });
  });

  describe("Create stream", function () {
    it("Must be able to start the stream with periode", async function () {
      const { altarTreasury, altar, periode } = await loadFixture(fixuture);
      await altarTreasury.startStream(periode, altar.address);
      expect(await altarTreasury.streamId()).to.not.equal(0);
      expect(await altar.streamId()).to.exist;
      expect(await altar.streamId()).to.equal(await altarTreasury.streamId());
    });

    it("Must be able to test stream in the time", async function () {
      const { altarTreasury, altar, periode, sablier, streamId, litBalance } =
        await loadFixture(startedStreamFixture);

      expect(await sablier.balanceOf(streamId, altarTreasury.address)).to.equal(
        litBalance
      );
      expect(await sablier.balanceOf(streamId, altar.address)).to.equal(0);

      await network.provider.send("evm_increaseTime", [periode + 120]);
      await network.provider.send("evm_mine"); // this one will have 02:00 PM as its timestamp
      expect(await sablier.balanceOf(streamId, altarTreasury.address)).to.equal(
        0
      );
      expect(await sablier.balanceOf(streamId, altar.address)).to.equal(
        litBalance
      );
    });
  });
});
