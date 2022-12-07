const { takeSnapshot, revertToSnapshot } = require('../utils').evm;
const setup = require('./setup');

describe('StakingPool unit tests', function () {
  before(setup);

  beforeEach(async function () {
    this.snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(this.snapshotId);
  });

  require('./calculatePremium');
  require('./constructor');
  require('./initialize');
  require('./setPoolFee');
  require('./setPoolPrivacy');
  require('./calculateNewRewardShares');
  require('./setProducts');
  require('./depositTo');
  require('./processExpirations');
  require('./extendDeposit');
});
