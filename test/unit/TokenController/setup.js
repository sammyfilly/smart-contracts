const { ethers } = require('hardhat');
const { getAccounts } = require('../../utils/accounts');
const { Role } = require('../../../lib/constants');
const { hex } = require('../utils').helpers;

const { parseEther } = ethers.utils;

async function setup() {
  const accounts = await getAccounts();
  const { internalContracts, members } = accounts;

  const stakingPoolFactory = await ethers.deployContract('StakingPoolFactory', [accounts.defaultSender.address]);

  const tokenController = await ethers.deployContract('TokenController', [
    '0x0000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000',
    stakingPoolFactory.address,
  ]);

  const master = await ethers.deployContract('MasterMock');

  const internal = internalContracts[0];

  await master.enrollGovernance(accounts.governanceContracts[0].address);

  const nxm = await ethers.deployContract('NXMTokenMock');

  const governance = await ethers.deployContract('TCMockGovernance');

  const assessment = await ethers.deployContract('TCMockAssessment');

  await master.enrollInternal(internal.address);
  await master.setTokenAddress(nxm.address);

  await tokenController.changeMasterAddress(master.address);
  await tokenController.changeDependentContractAddress();

  const mintAmount = parseEther('10000');

  await nxm.mint(tokenController.address, mintAmount);

  nxm.setOperator(tokenController.address);

  for (const member of members) {
    await master.enrollMember(member.address, Role.Member);
    await tokenController.connect(internal).addToWhitelist(member.address);
    await nxm.mint(member.address, mintAmount);
    await nxm.connect(member).approve(tokenController.address, mintAmount);
  }

  master.setLatestAddress(hex('GV'), accounts.governanceContracts[0].address);
  await tokenController.connect(accounts.governanceContracts[0]).changeOperator(tokenController.address);

  const masterInitTxs = await Promise.all([
    master.setTokenAddress(nxm.address),
    master.setLatestAddress(hex('GV'), governance.address),
    master.setLatestAddress(hex('AS'), assessment.address),
  ]);
  await Promise.all(masterInitTxs.map(x => x.wait()));

  await tokenController.changeDependentContractAddress();

  this.accounts = accounts;
  this.contracts = {
    nxm,
    master,
    governance,
    tokenController,
    assessment,
    stakingPoolFactory,
  };
}

module.exports = setup;
