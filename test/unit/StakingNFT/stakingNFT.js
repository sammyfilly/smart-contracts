const { ethers } = require('hardhat');
const { expect } = require('chai');
const { setEtherBalance } = require('../../utils/evm');
const { toBytes } = require('../../../lib/helpers');
const { BigNumber } = ethers;
const { AddressZero } = ethers.constants;

describe('StakingNFT', function () {
  // impersonate staking pool address
  before(async function () {
    const { cover } = this;
    const poolId = 50;
    const stakingAddress = await cover.stakingPool(poolId);
    await setEtherBalance(stakingAddress, ethers.utils.parseEther('1000'));
    await setEtherBalance(cover.address, ethers.utils.parseEther('1000'));
    const stakingPoolSigner = await ethers.getImpersonatedSigner(stakingAddress);
    const coverSigner = await ethers.getImpersonatedSigner(cover.address);

    this.stakingPoolSigner = stakingPoolSigner;
    this.coverSigner = coverSigner;
    this.poolId = poolId;
  });

  it('should verify that constructor variables were set correctly', async function () {
    const { stakingNFT } = this;
    expect(await stakingNFT.name()).to.be.eq('NexusMutual Staking');
    expect(await stakingNFT.symbol()).to.be.eq('NXMS');
    expect(await stakingNFT.totalSupply()).to.be.eq(0);
  });

  it('should revert if changing operator from non operator account', async function () {
    const { stakingNFT } = this;
    const [member] = this.accounts.members;
    await expect(stakingNFT.connect(member).changeOperator(member.address)).to.be.revertedWithCustomError(
      stakingNFT,
      'NotOperator',
    );
  });

  it('should revert if changing operator to zero address account', async function () {
    const { stakingNFT } = this;
    await expect(stakingNFT.connect(this.coverSigner).changeOperator(AddressZero)).to.be.revertedWithCustomError(
      stakingNFT,
      'InvalidNewOperatorAddress',
    );
  });

  it('should revert if changing nft descriptor from non operator account', async function () {
    const { stakingNFT } = this;
    const [member] = this.accounts.members;
    await expect(stakingNFT.connect(member).changeNFTDescriptor(member.address)).to.be.revertedWithCustomError(
      stakingNFT,
      'NotOperator',
    );
  });

  it('should revert if changing nft descriptor to zero address account', async function () {
    const { stakingNFT } = this;
    await expect(stakingNFT.connect(this.coverSigner).changeNFTDescriptor(AddressZero)).to.be.revertedWithCustomError(
      stakingNFT,
      'InvalidNewNFTDescriptorAddress',
    );
  });

  it('should revert when calling tokenURI for unminted token', async function () {
    const { stakingNFT } = this;
    await expect(stakingNFT.tokenURI(0)).to.be.revertedWithCustomError(stakingNFT, 'NotMinted');
  });

  it('should revert when reading tokenInfo for a non-existent token', async function () {
    const { stakingNFT } = this;
    await expect(stakingNFT.tokenInfo(0)).to.be.revertedWithCustomError(stakingNFT, 'NotMinted');
  });

  it('should revert if calling stakingPoolOf for a non existent token', async function () {
    const { stakingNFT } = this;
    await expect(stakingNFT.stakingPoolOf(0)).to.be.revertedWithCustomError(stakingNFT, 'NotMinted');
  });

  it('should fail to mint to zero address', async function () {
    const { stakingNFT } = this;
    await expect(
      stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, ethers.constants.AddressZero),
    ).to.be.revertedWithCustomError(stakingNFT, 'InvalidRecipient');
  });

  it('should fail to mint - OnlyStakingPool()', async function () {
    const { stakingNFT } = this;
    const [member] = this.accounts.members;
    await expect(stakingNFT.connect(member).mint(this.poolId, member.address)).to.be.revertedWithCustomError(
      stakingNFT,
      'NotStakingPool',
    );
  });

  it('should successfully mint', async function () {
    const { stakingNFT } = this;
    const [nftOwner] = this.accounts.members;
    const tokenId = 1;
    await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, nftOwner.address);
    expect(await stakingNFT.ownerOf(tokenId)).to.be.equal(nftOwner.address);
    expect(await stakingNFT.stakingPoolOf(tokenId)).to.be.equal(this.poolId);
    const { poolId, owner } = await stakingNFT.tokenInfo(tokenId);
    expect(poolId).to.be.equal(this.poolId);
    expect(owner).to.be.equal(nftOwner.address);
    expect(await stakingNFT.totalSupply()).to.be.eq(1);
  });

  it('should return success for isApproveOrOwner() - owner == sender', async function () {
    const { stakingNFT } = this;
    const [operator, nftOwner] = this.accounts.members;
    await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, nftOwner.address);
    expect(await stakingNFT.isApprovedOrOwner(nftOwner.address, 1)).to.be.equal(true);
    expect(await stakingNFT.isApprovedOrOwner(operator.address, 1)).to.be.equal(false);
  });

  it('should increment totalSupply properly', async function () {
    const { stakingNFT } = this;
    const [nftOwner] = this.accounts.members;
    for (let i = 0; i < 10; i++) {
      await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, nftOwner.address);
    }
    expect(await stakingNFT.totalSupply()).to.be.eq(10);
    expect(await stakingNFT.balanceOf(nftOwner.address)).to.be.eq(10);
    expect(await stakingNFT.balanceOf(this.stakingPoolSigner.address)).to.be.eq(0);
    expect(await stakingNFT.ownerOf(10)).to.be.equal(nftOwner.address);
    const [owner, nonOwner] = this.accounts.members;
    await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, owner.address);
    expect(await stakingNFT.isApprovedOrOwner(owner.address, 1)).to.be.equal(true);
    expect(await stakingNFT.isApprovedOrOwner(nonOwner.address, 1)).to.be.equal(false);
  });

  it('should revert when msg.sender is not the owner of the token - NOT_AUTHORIZED', async function () {
    const { stakingNFT } = this;
    const [owner, nonOwner] = this.accounts.members;
    await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, owner.address);
    await expect(stakingNFT.connect(nonOwner).approve(nonOwner.address, 1)).to.be.revertedWithCustomError(
      stakingNFT,
      'NotAuthorized',
    );
  });

  it('should revert if reading balance of 0 address - NotMinted', async function () {
    const { stakingNFT } = this;
    await expect(stakingNFT.balanceOf(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
      stakingNFT,
      'NotMinted',
    );
  });

  it('should revert if trying to transferFrom a token from a non-owner - WrongFrom', async function () {
    const { stakingNFT } = this;
    const [nonOwner, owner] = this.accounts.members;
    await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, owner.address);
    await expect(stakingNFT.transferFrom(nonOwner.address, owner.address, 1)).to.be.revertedWithCustomError(
      stakingNFT,
      'WrongFrom',
    );
  });

  it('should revert if trying to transferFrom a token to a zero address - ZeroAddress', async function () {
    const { stakingNFT } = this;
    const [owner] = this.accounts.members;
    await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, owner.address);
    await expect(stakingNFT.transferFrom(owner.address, ethers.constants.AddressZero, 1)).to.be.revertedWithCustomError(
      stakingNFT,
      'InvalidRecipient',
    );
  });

  it('should revert if not approved to transferFrom a token - NOT_AUTHORIZED', async function () {
    const { stakingNFT } = this;
    const [owner, nonOwner] = this.accounts.members;
    await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, owner.address);
    await expect(
      stakingNFT.connect(nonOwner).transferFrom(owner.address, nonOwner.address, 1),
    ).to.be.revertedWithCustomError(stakingNFT, 'NotAuthorized');
  });

  it('should transferFrom a token', async function () {
    const { stakingNFT } = this;
    const [owner, nonOwner] = this.accounts.members;
    await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, owner.address);
    await stakingNFT.connect(owner).approve(nonOwner.address, 1);
    await stakingNFT.connect(nonOwner).transferFrom(owner.address, nonOwner.address, 1);
    expect(await stakingNFT.ownerOf(1)).to.be.equal(nonOwner.address);
  });

  it('should fail to safeTransfer with bytes to a contract without onERC721Received function', async function () {
    const { stakingNFT, cover } = this;
    const [owner] = this.accounts.members;
    await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, owner.address);
    // Reverts without reason if the contract does not implement onERC721Received
    await expect(
      stakingNFT
        .connect(owner)
        ['safeTransferFrom(address,address,uint256,bytes)'](
          owner.address,
          cover.address,
          BigNumber.from(1),
          toBytes('cafe'),
        ),
    ).to.be.revertedWithoutReason();
  });

  it('should fail to safeTransfer to a contract that does not implement onERC721Received', async function () {
    const { stakingNFT, cover } = this;
    const [owner] = this.accounts.members;
    await stakingNFT.connect(this.stakingPoolSigner).mint(this.poolId, owner.address);
    // Reverts without reason if the contract does not implement onERC721Received
    await expect(
      stakingNFT
        .connect(owner)
        ['safeTransferFrom(address,address,uint256)'](owner.address, cover.address, BigNumber.from(1)),
    ).to.be.revertedWithoutReason();
  });

  it('should support erc721 and ERC165 interfaces', async function () {
    const { stakingNFT } = this;
    // 0x80ac58cd // ERC165 Interface ID for ERC721
    expect(await stakingNFT.supportsInterface('0x80ac58cd')).to.be.equal(true);
    // 0x01ffc9a7 // ERC165 Interface ID for ERC165
    expect(await stakingNFT.supportsInterface('0x01ffc9a7')).to.be.equal(true);
    // 0x5b5e139f   // ERC165 Interface ID for ERC721Metadata
    expect(await stakingNFT.supportsInterface('0x5b5e139f')).to.be.equal(true);
    expect(await stakingNFT.supportsInterface('0xdeadbeef')).to.be.equal(false);
  });
});
