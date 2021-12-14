const { takeSnapshot, revertToSnapshot } = require('../utils').evm;
const { setup } = require('./setup');

describe('Incidents', function () {
  before(setup);

  beforeEach(async function () {
    this.snapshotId = await takeSnapshot();
  });

  afterEach(async function () {
    await revertToSnapshot(this.snapshotId);
  });

  require('./submitIncident');
  require('./redeemIncidentPayout');
  require('./withdrawAsset');
  require('./updateUintParameters');
});
