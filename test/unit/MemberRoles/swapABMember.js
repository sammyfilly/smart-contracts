const { Role } = require('../utils').constants;
const { expect } = require('chai');

describe('swapABMember', function () {
  it('removes address from AdvisoryBoard and add another one', async function () {
    const { memberRoles } = this.contracts;
    const { advisoryBoardMembers, governanceContracts } = this.accounts;
    const [oldABMember, newABMember] = advisoryBoardMembers;

    await memberRoles.connect(governanceContracts[0]).swapABMember(newABMember.address, oldABMember.address);
    const hasABMemberRoleOldMember = await memberRoles.checkRole(oldABMember.address, Role.AdvisoryBoard);
    const hasABMemberRoleNewMember = await memberRoles.checkRole(newABMember.address, Role.AdvisoryBoard);

    expect(hasABMemberRoleOldMember).to.be.equal(false);
    expect(hasABMemberRoleNewMember).to.be.equal(true);
  });

  it('should allow only authorized addresses to swap AB member', async function () {
    const { memberRoles } = this.contracts;
    const { advisoryBoardMembers } = this.accounts;
    const [oldABMember, newABMember] = advisoryBoardMembers;

    await expect(
      memberRoles.connect(newABMember).swapABMember(newABMember.address, oldABMember.address),
    ).to.be.revertedWith('Not Authorized');
  });
});
