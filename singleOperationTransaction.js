/**
 * @param {number[]} targetWeights 
 * @param {number[]} assetValues 
 * @param {number} portfolioValue 
 */
function rebalance(targetWeights, assetValues, portfolioValue)
{
    return targetWeights.map((tWeight, i) => (portfolioValue * tWeight) - assetValues[i]);
}

/**
 * @param {number[]} targetWeights 
 * @param {number[]} assetValues 
 * @param {number} portfolioValue 
 */
function changeInTotalPortfolioValueNeededForCurrentAssetValueToBeTargetWeight(targetWeights, assetValues, portfolioValue)
{
    return targetWeights.map((tWeight, i) => (assetValues[i] / tWeight) - portfolioValue);
}

/**
 * The minimum investment to the portfolio so each asset returns to it's
 * target weights. Assumes the only possible portfolio operation is to buy.
 * 
 * @param {number[]} targetWeights in percents
 * @param {number[]} assetValues
 */
function minInvestmentForFullBuyRebalance(targetWeights, assetValues, portfolioValue)
{
    // the result corresponds to the asset which is the most over weight.
    // since this models the scenario where the asset value does not change
    // in value but the portfolio value needs to go up in order for the asset
    // to be the correct weight, and the higher the portfolio value, the lower
    // weight of the asset (assuming none of the new value is from this asset)
    return Math.max(...changeInTotalPortfolioValueNeededForCurrentAssetValueToBeTargetWeight(targetWeights, assetValues, portfolioValue));
}

/**
 * The minimum extraction (sale of assets) from the portfolio so each asset returns
 * to its target weights. Assumes the only possible portfolio operation is to sell.
 *
 * @param {number[]} targetWeights in percents
 * @param {number[]} assetValues
 */
function minExtractionForFullSellRebalance(targetWeights, assetValues, portfolioValue)
{
    return Math.min(...changeInTotalPortfolioValueNeededForCurrentAssetValueToBeTargetWeight(targetWeights, assetValues, portfolioValue));
}

/**
 * @param {number[]} targetWeights 
 * @param {number[]} assetValues 
 * @param {number} portfolioValue 
 * @returns 
 */
function getMostUnderWeightIndex(targetWeights, assetValues, portfolioValue)
{
    return rebalance(targetWeights, assetValues, portfolioValue)
        .reduce((underWeightIndex, val, i, self) =>
            (val > self[underWeightIndex]) ? i : underWeightIndex
            , 0
        );
}

/**
 * @param {number[]} targetWeights 
 * @param {number[]} assetValues 
 * @param {number} portfolioValue 
 * @returns 
 */
function getMostOverWeightIndex(targetWeights, assetValues, portfolioValue)
{
    return rebalance(targetWeights, assetValues, portfolioValue)
        .reduce((overWeightIndex, val, i, self) =>
            (val < self[overWeightIndex]) ? i : overWeightIndex
            , 0
        );
}

/**
 * BUY/SELL in a weight aware fashion, that ONLY allows
 * BUYs or SELLs, not both, unlike rebalance.
 * 
 * @param {number[]} targetWeights in percents
 * @param {number[]} assetValues
 * @param {number} portfolioValue
 * @param {number} targetPortfolioValueChange
 * @returns {number[]}
 */
function singleOperationTransaction(targetWeights, assetValues, portfolioValue, targetPortfolioValueChange, maxIter = 1000)
{
    /**
     * The basic idea is that when you are buying, you want to buy of the most
     * under weight asset. The way I decide which is the most under weight
     * asset is to just figure out what the traditional rebalance says is the most
     * under weight, aka which has the greatest positive target change. And from there
     * you just change that asset by a "change packet" and figure out what is the new
     * most under weight asset is.
     */
    const isSell = targetPortfolioValueChange < 0;
    if (isSell && targetPortfolioValueChange >= portfolioValue) return assetValues.map((val) => -val);


    const newAssetValues = [...assetValues];
    const changePacket = targetPortfolioValueChange / maxIter;

    // choosing what to prioritize, if selling want to sell most over weight index first, else its the opposite
    const assetSelector = isSell ? getMostOverWeightIndex : getMostUnderWeightIndex;
    for (let i = 0, currPortfolioValue = portfolioValue; i < maxIter; i += 1, currPortfolioValue += changePacket)
    {
        newAssetValues[assetSelector(targetWeights, newAssetValues, currPortfolioValue)] += changePacket;
    }

    return newAssetValues.map((value, i) => value - assetValues[i]);
}


/**
 *
 * @param {number[]} targetWeights in percents
 * @param {number[]} assetValues
 * @param {number} portfolioValue
 * @param {number} targetAssetIndex
 * @returns {number[]}
 */
function targetAssetValueChangeForItsRebalanceValueToBeEqualToAnotherAssetsRebalanceValue(targetWeights, assetValues, portfolioValue, targetAssetIndex)
{
    const tw0 = targetWeights[targetAssetIndex];
    const av0 = assetValues[targetAssetIndex];

    return targetWeights.map((tw1, i) => (portfolioValue * (tw1 - tw0) + av0 - assetValues[i]) / (tw0 - tw1 - 1)); 
}

/**
 *
 * @param {number[]} targetWeights in percents
 * @param {number[]} assetValues
 * @param {number} portfolioValue
 * @param {number} targetAssetIndex
 * @param {number} targetPortfolioValueChange
 * @param {boolean} isSell
 * @returns {number[]}
 */
function getInitValueChange(targetWeights, assetValues, portfolioValue, targetAssetIndex, targetPortfolioValueChange, isSell)
{
    const allChanges = targetAssetValueChangeForItsRebalanceValueToBeEqualToAnotherAssetsRebalanceValue(targetWeights, assetValues, portfolioValue, targetAssetIndex);
    allChanges[targetAssetIndex] = isSell ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
    const mode = isSell ? Math.max : Math.min;
    return mode(targetPortfolioValueChange,  ...allChanges);
}


/**
 * BUY/SELL in a weight aware fashion, that ONLY allows
 * BUYs or SELLs, not both, unlike rebalance.
 * 
 * @param {number[]} targetWeights in percents
 * @param {number[]} assetValues
 * @param {number} portfolioValue
 * @param {number} targetPortfolioValueChange
 * @returns {number[]}
 */
function fastSingleOperationTransaction(targetWeights, assetValues, portfolioValue, targetPortfolioValueChange, maxIter = 1000)
{
    /**
     * The biggest difference between the fastSingleOperationTransaction &&
     * singleOperationTransaction is the initial change in value to the most under/over weight
     * asset. Most times the change amount needed to turn the most under/over weight asset
     * to NOT the MOST under/over weight asset is greater than a change packet. So
     * with singleOperationTransaction a lot of the first iterations are wasted in incrementing
     * the most under/over weight asset without any change. With this now I just get right into
     * the part where the title of the most under/over weight asset tends to flip flop
     * between different assets all the time and therefore I am actually forced to do
     * all the extraneous calculation that I was wasting previously to get to this point
     * with singleOperationTransaction
     */
    if (-targetPortfolioValueChange >= portfolioValue) return assetValues.map((val) => -val);


    const isSell = targetPortfolioValueChange < 0;
    const newAssetValues = [...assetValues];
    const changePacket = targetPortfolioValueChange / maxIter;

    // choosing what to prioritize, if selling want to sell most over weight index first, else its the opposite
    const assetSelector = isSell ? getMostOverWeightIndex : getMostUnderWeightIndex;

    const initIndex = assetSelector(targetWeights, newAssetValues, portfolioValue);
    const initChange = getInitValueChange(
        targetWeights,
        newAssetValues,
        portfolioValue,
        initIndex,
        targetPortfolioValueChange,
        isSell
    );
    newAssetValues[initIndex] += initChange;

    let portfolioValueChange = initChange;
    const conditionChecker = isSell ?
        () => portfolioValueChange + changePacket > targetPortfolioValueChange : // + changePacket minimizes checks in the loop
        () => portfolioValueChange + changePacket < targetPortfolioValueChange;
    for (; conditionChecker(); portfolioValueChange += changePacket)
    {
        console.log(rebalance(targetWeights, newAssetValues, portfolioValue + portfolioValueChange))
        newAssetValues[
            assetSelector(
                targetWeights,
                newAssetValues,
                portfolioValue + portfolioValueChange
            )
        ] += changePacket;
    }

    if (initChange !== targetPortfolioValueChange)
    {
        newAssetValues[
            assetSelector(
                targetWeights,
                newAssetValues,
                portfolioValue + portfolioValueChange
            )
        ] += targetPortfolioValueChange - portfolioValueChange;
    }

    return newAssetValues.map((value, i) => value - assetValues[i]);
}





const targetWeights = [
    24.02 / 100,
    25.96 / 100,
    9.97 / 100,
    14.99 / 100,
    20.00 / 100,
    0.02 / 100,
    5.03 / 100,
    0.01 / 100,
];


const assetValues = [
    78801.32,
    100985.48,
    22217.22,
    66966.56,
    88836.57,
    22345.56,
    44906.81,
    154.60,
];
const portfolioValue = assetValues.reduce((sum, val) => sum + val, 0);
const moneyToInvest = 108979130.19;
const moneyToExtract = -12400;


singleOperationTransaction    (targetWeights, assetValues, portfolioValue, moneyToExtract, 1000).map(val => Math.floor(val));        // ?
fastSingleOperationTransaction(targetWeights, assetValues, portfolioValue, moneyToExtract, 1000).map(val => Math.floor(val));        // ?
rebalance(targetWeights, assetValues, portfolioValue + moneyToInvest).map(val => Math.floor(val));                                  // ?


fastSingleOperationTransaction(
    targetWeights,
    assetValues,
    portfolioValue,
    moneyToInvest,
    5
).map(Math.floor); // ?

/**
 * Figure out what happens when you choose to use
 * CHANGE_IN_TOTAL_PORTFOLIO_VALUE_NEEDED_FOR_CURRENT_ASSET_VALUE_TO_BE_TARGET_WEIGHT   
 * as the method of deciding what to contribute and when not to contribute to instead
 * of diff from target which is also the rebalance amount.
 */


