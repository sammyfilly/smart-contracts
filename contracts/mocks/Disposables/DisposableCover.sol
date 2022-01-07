// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.8.0;

import "../../abstract/MasterAwareV2.sol";
import "../../interfaces/ICover.sol";
import "../../interfaces/IQuotationData.sol";
import "../../interfaces/IProductsV1.sol";
import "../../modules/cover/MinimalBeaconProxy.sol";

contract DisposableCover is MasterAwareV2 {

  /* ========== STATE VARIABLES ========== */

  ICover.Product[] public products;
  ICover.ProductType[] public productTypes;

  ICover.CoverData[] private coverData;
  mapping(uint => mapping(uint => ICover.PoolAllocation[])) public coverSegmentAllocations;

  /*
    Each Cover has an array of segments. A new segment is created everytime a cover is edited to
    deliniate the different cover periods.
  */
  mapping(uint => ICover.CoverSegment[]) coverSegments;

  uint24 public globalCapacityRatio;
  uint24 public globalRewardsRatio;
  uint64 public stakingPoolCounter;

  /*
    bit map representing which assets are globally supported for paying for and for paying out covers
    If the the bit at position N is 1 it means asset with index N is supported.this
    Eg. coverAssetsFallback = 3 (in binary 11) means assets at index 0 and 1 are supported.
  */
  uint32 public coverAssetsFallback;

  function addProductType(ICover.ProductType calldata productType) public {
    productTypes.push(productType);
  }

  function addProduct(ICover.Product calldata product) public {
    products.push(product);
  }

  function setInitialPrice(uint productId, uint16 initialPriceRatio) external {
    products[productId].initialPriceRatio = initialPriceRatio;
  }

  function setCoverAssetsFallback(uint32 _coverAssetsFallback) external {
    coverAssetsFallback = _coverAssetsFallback;
  }

  function changeDependentContractAddress() external override {}

}
