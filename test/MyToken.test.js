const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyToken", function () {
  let token;
  let owner, alice, bob;
  const NAME = "MyToken";
  const SYMBOL = "MTK";
  const INITIAL_SUPPLY = ethers.parseUnits("100000000", 18); // 100M
  const MAX_SUPPLY = ethers.parseUnits("1000000000", 18);    // 1B

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const MyToken = await ethers.getContractFactory("MyToken");
    token = await MyToken.deploy(NAME, SYMBOL, INITIAL_SUPPLY, owner.address);
    await token.waitForDeployment();
  });

  // ── Deployment ──────────────────────────────────────────────────────────────

  describe("Deployment", function () {
    it("sets the correct name and symbol", async function () {
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
    });

    it("mints initial supply to the owner", async function () {
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("sets the deployer as owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("reverts if initial supply exceeds MAX_SUPPLY", async function () {
      const MyToken = await ethers.getContractFactory("MyToken");
      const tooMany = MAX_SUPPLY + 1n;
      await expect(
        MyToken.deploy(NAME, SYMBOL, tooMany, owner.address)
      ).to.be.revertedWith("MyToken: initial supply exceeds max supply");
    });
  });

  // ── Transfers ────────────────────────────────────────────────────────────────

  describe("Transfers", function () {
    it("allows token transfers between accounts", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await token.transfer(alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("reverts transfer with insufficient balance", async function () {
      const amount = ethers.parseUnits("1", 18);
      await expect(
        token.connect(alice).transfer(bob.address, amount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  // ── Minting ──────────────────────────────────────────────────────────────────

  describe("Minting", function () {
    it("allows owner to mint tokens", async function () {
      const amount = ethers.parseUnits("5000", 18);
      await token.mint(alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + amount);
    });

    it("emits Minted event", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await expect(token.mint(alice.address, amount))
        .to.emit(token, "Minted")
        .withArgs(alice.address, amount);
    });

    it("reverts minting beyond MAX_SUPPLY", async function () {
      const overMint = MAX_SUPPLY - INITIAL_SUPPLY + 1n;
      await expect(token.mint(alice.address, overMint)).to.be.revertedWith(
        "MyToken: minting would exceed max supply"
      );
    });

    it("reverts minting by non-owner", async function () {
      await expect(
        token.connect(alice).mint(alice.address, ethers.parseUnits("1", 18))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  // ── Burning ──────────────────────────────────────────────────────────────────

  describe("Burning", function () {
    it("allows token holders to burn their tokens", async function () {
      const amount = ethers.parseUnits("1000", 18);
      await token.transfer(alice.address, amount);
      await token.connect(alice).burn(amount);
      expect(await token.balanceOf(alice.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - amount);
    });

    it("reverts burning more than balance", async function () {
      await expect(
        token.connect(alice).burn(ethers.parseUnits("1", 18))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  // ── Pausing ──────────────────────────────────────────────────────────────────

  describe("Pausing", function () {
    it("owner can pause and unpause transfers", async function () {
      await token.pause();
      await expect(
        token.transfer(alice.address, ethers.parseUnits("1", 18))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");

      await token.unpause();
      await expect(
        token.transfer(alice.address, ethers.parseUnits("1", 18))
      ).to.not.be.reverted;
    });

    it("reverts pause by non-owner", async function () {
      await expect(
        token.connect(alice).pause()
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  // ── Permit (EIP-2612) ────────────────────────────────────────────────────────

  describe("Permit (EIP-2612)", function () {
    it("allows gasless approval via permit", async function () {
      const amount = ethers.parseUnits("500", 18);
      const nonce = await token.nonces(owner.address);
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const domain = {
        name: NAME,
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const message = {
        owner: owner.address,
        spender: alice.address,
        value: amount,
        nonce,
        deadline,
      };

      const sig = await owner.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(sig);

      await token.permit(owner.address, alice.address, amount, deadline, v, r, s);
      expect(await token.allowance(owner.address, alice.address)).to.equal(amount);
    });
  });
});
