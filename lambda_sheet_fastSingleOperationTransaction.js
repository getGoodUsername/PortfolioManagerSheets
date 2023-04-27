/**
 * @param {number[]} targetWeights
 * @param {number[]} assetValues
 * @param {number} portfolioValue
 * @returns {number[]}
 */
function rebalance(targetWeights, assetValues, portfolioValue)
{
    return targetWeights.map((tWeight, i) => (portfolioValue * tWeight) - assetValues[i]);
}


/**
 * Below is a version of SingleOperationTransaction that
 * does't allow looping, and doesn't allow for
 * mutability or the creation of local variables.
 *
 * This is a proof of concept for a google sheets
 * named function. This should be translatable to a
 * google sheets named function.
 *
 * 
 * NAMED RANGES:
 * targetBuySell                - user input, > 0 means buy, < 0 means sell.
 * isSell                       - is targetBuySell < 0? If false must be buy or targetBuySell === 0
 * portfolioValue               - sum of current value of assets in the google sheet
 * numberOfTickers              - named range, number of assets/tickers
 * minOnlyBuyRebalance          - min value so rebalance will result in ONLY BUY operation transaction
 * minOnlySellRebalance         - min value so rebalance will result in ONLY SELL operation transaction
 * maxSingleOpTransactionIter   - max number of internal MAIN loops, the bigger the number, the longer the function takes but also the more accurate.
 * changePacket                 - targetBuySell / maxSingleOpTransactionIter (the discrete size of the change of an asset per operation)
 */


/**
 * @param {number[]} currTargetWeights
 * @param {number[]} startAssetValues
 * @param {number} portfolioValue
 * @returns {number[]}
 */
function GET_INIT_VALUE_CHANGE_DERIVED_FROM_TARGET_ASSET_VALUE_CHANGE_FOR_ITS_REBALANCE_VALUE_TO_BE_EQUAL_TO_ANOTHER_ASSETS_REBALANCE_VALUE
(
    targetWeights,
    startAssetValues,
    startPortfolioValue,
    targetAssetIndex,
    targetPortfolioValueChange,
    isSell
)
{
    return ((assetValueChangesForEqRebalanceVal) =>
    {
        if (isSell) return Math.max(...assetValueChangesForEqRebalanceVal, targetPortfolioValueChange);
        return Math.min(...assetValueChangesForEqRebalanceVal, targetPortfolioValueChange);
    })(
        ((targetWeight0, assetValue0, ignoreSelfValue) =>
        {
            return targetWeights
                .map((targetWeight1, i) => i === targetAssetIndex ? ignoreSelfValue /** else will be zero and fuck the shit up */:
                    (startPortfolioValue * (targetWeight1 - targetWeight0) + assetValue0 - startAssetValues[i]) / (targetWeight0 - targetWeight1 - 1)
                )
        })(
            targetWeights[targetAssetIndex],
            startAssetValues[targetAssetIndex],
            isSell ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
        )
    )
/**
 * 
Main calculation for TARGET_ASSET_VALUE_CHANGE_FOR_ITS_REBALANCE_VALUE_TO_BE_EQUAL_TO_ANOTHER_ASSETS_REBALANCE_VALUE:
rebalance(pv, tw, av) = pv * tw - av;

rebalance(pv + x, tw0, av0 + x) = rebalance(pv + x, tw1, av1)  // where x is the change in av0 so values are equal. (if av0 is most underweight x will always be > 0, if av0 is most overweight x will always be < 0)
(pv + x) * tw0 - (av0 + x) = (pv + x) * tw1 - av1
pv*tw0 + x*tw0 - av0 - x = pv*tw1 + x*tw1 - av1
x*(tw0 - tw1 - 1) + pv*tw0 - av0 = pv*tw1 - av1
x*(tw0 - tw1 - 1) = pv*(tw1 - tw0) + av0 - av1
x = (pv*(tw1 - tw0) + av0 - av1) / (tw0 - tw1 - 1)



GOOGLE SHEETS TRANSLATION:

Extra parameter for optimization:
index_numbers                    ->    index_numbers         // used to reduce call to SEQUENCE and making new array every time.

Main parameters:
targetWeights                   ->    target_weights
startAssetValues                ->    start_asset_values
targetAssetIndex                ->    target_asset_index

NAMED RANGES:
startPortfolioValue             ->    portfolioValue    (named range)
targetPortfolioValueChange      ->    targetBuySell     (named range)
isSell                          ->    isSell            (named range)

=LAMBDA(
    assetValueChangesForEqRebalanceVal,
    IF(isSell,
        MAX(assetValueChangesForEqRebalanceVal, targetBuySell),
        MIN(assetValueChangesForEqRebalanceVal, targetBuySell)
    )
)(
    LAMBDA(targetWeight0, assetValue0, ignoreSelfValue,
        MAP(target_weights, start_asset_values, index_numbers,
            LAMBDA(targetWeight1, assetValue1, i,
                IF(i = target_asset_index,
                    ignoreSelfValue,
                    (portfolioValue * (targetWeight1 - targetWeight0) + assetValue0 - assetValue1) / (targetWeight0 - targetWeight1 - 1)
                )
            )
        )
    )(
        INDEX(target_weights, target_asset_index),
        INDEX(start_asset_values, target_asset_index),
        IF(isSell, -1.79769313486231E+308, 1.79769313486231E+308)
    )
)

=LET(
    targetWeight0,
        INDEX(target_weights, target_asset_index),
    assetValue0,
        INDEX(start_asset_values, target_asset_index),
    ignoreSelfValue,
        IF(isSell, -1.79769313486231E+308, 1.79769313486231E+308),
    assetValueChangesForEqRebalanceVal,
        MAP(target_weights, start_asset_values, index_numbers,
            LAMBDA(targetWeight1, assetValue1, i,
                IF(i = target_asset_index,
                    ignoreSelfValue,
                    (portfolioValue * (targetWeight1 - targetWeight0) + assetValue0 - assetValue1) / (targetWeight0 - targetWeight1 - 1)
                )
            )
        ),
    IF(isSell,
        MAX(assetValueChangesForEqRebalanceVal, targetBuySell),
        MIN(assetValueChangesForEqRebalanceVal, targetBuySell)
    )
)

*/
}

/**
 * @param {number[]} targetWeights
 * @param {number[]} currAssetValues
 * @param {number} currPortfolioValue
 * @returns {number[]}
 */
function GET_MOST_UNDERWEIGHT_INDEX(targetWeights, currAssetValues, currPortfolioValue)
{
    return ((currRebalance) =>
        currRebalance.reduce((underWeightIndex, val, i) => (val > currRebalance[underWeightIndex]) ? i : underWeightIndex, 0)
    )(rebalance(targetWeights, currAssetValues, currPortfolioValue));

/**
GOOGLE SHEETS TRANSLATION:

Extra parameter for optimization:
index_numbers                               ->    index_numbers         // used to reduce call to SEQUENCE and making new array every time.

Main parameters:
targetWeights                               ->    target_weights
currAssetValues                             ->    curr_asset_values
currPortfolioValue                          ->    curr_portfolio_values

=LAMBDA(currRebalance,
    REDUCE(1, index_numbers,
        LAMBDA(underWeightIndex, i,
            IF(INDEX(currRebalance, i) > INDEX(currRebalance, underWeightIndex),
                i,
                underWeightIndex
            )
        )
    )
)(REBALANCE(target_weights, curr_asset_values, curr_portfolio_values))

=LET(
    currRebalance,
    REBALANCE(target_weights, curr_asset_values, curr_portfolio_values),
    REDUCE(1, index_numbers,
        LAMBDA(underWeightIndex, i,
            IF(INDEX(currRebalance, i) > INDEX(currRebalance, underWeightIndex),
                i,
                underWeightIndex
            )
        )
    )
)
*/
}

/**
 * @param {number[]} targetWeights
 * @param {number[]} currAssetValues
 * @param {number} currPortfolioValue
 * @returns {number[]}
 */
function GET_MOST_OVERWEIGHT_INDEX(targetWeights, currAssetValues, currPortfolioValue)
{
    return ((currRebalance) =>
        currRebalance.reduce((overWeightIndex, val, i) => (val < currRebalance[overWeightIndex]) ? i : overWeightIndex, 0)
    )(rebalance(targetWeights, currAssetValues, currPortfolioValue));
/**
GOOGLE SHEETS TRANSLATION:

Extra parameter for optimization:
index_numbers                               ->    index_numbers         // used to reduce call to SEQUENCE and making new array every time.

Main parameters:
targetWeights                               ->    target_weights
currAssetValues                             ->    curr_asset_values
currPortfolioValue                          ->    curr_portfolio_values

=LAMBDA(currRebalance,
    REDUCE(1, index_numbers,
        LAMBDA(overWeightIndex, i,
            IF(INDEX(currRebalance, i) < INDEX(currRebalance, overWeightIndex),
                i,
                overWeightIndex
            )
        )
    )
)(REBALANCE(target_weights, curr_asset_values, curr_portfolio_values))

=LET(
    currRebalance,
    REBALANCE(target_weights, curr_asset_values, curr_portfolio_values),
    REDUCE(1, index_numbers,
        LAMBDA(overWeightIndex, i,
            IF(INDEX(currRebalance, i) < INDEX(currRebalance, overWeightIndex),
                i,
                overWeightIndex
            )
        )
    )
)
*/
}

/**
 * 
 * @param {number[]} currAssetValues
 * @param {number} changeIndex
 * @param {number} changeValue
 */
function NEXT_ASSET_VALUES(currAssetValues, changeIndex, changeValue)
{
    return currAssetValues.map((val, i) => (i === changeIndex) ? val + changeValue : val);
/**
GOOGLE SHEETS TRANSLATION:

Extra parameter for optimization:
index_numbers           ->    index_numbers         // used to reduce call to SEQUENCE and making new array every time.

Main parameters:
currAssetValues         ->      curr_asset_values
changeIndex             ->      change_index
changeValue             ->      change_value

=MAP(curr_asset_values, index_numbers,
    LAMBDA(val, i,
        IF(i = change_index,
            val + change_value,
            val
        )
    )
)
*/
}

/**
 * @param {number[]} currAssetValues
 * @param {number} startPortfolioValue
 * @param {number} targetPortfolioValueChange - positive if want to buy, negative if want to sell
 * @param {number} initChange
 * @param {(currAssetValues: number[], currPortfolioValue: number[]) => number[]} assetSelector
 * @param {number} changePacket
 */
function NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(
    currAssetValues,
    startPortfolioValue,
    targetPortfolioValueChange,
    initChange,
    assetSelector,
    changePacket
)
{
    return ((iterCount, getCurrPortfolioValue) =>
    {
        return ((finalAssetValues) =>
        {
            return NEXT_ASSET_VALUES(
                finalAssetValues,
                assetSelector(finalAssetValues, getCurrPortfolioValue(iterCount)),
                startPortfolioValue + targetPortfolioValueChange - getCurrPortfolioValue(iterCount)
            )
        })(
            (new Array(iterCount).fill(0)) // array to be able to loop without having to change any value
            .reduce((finalAssetValues, ignore, i) => NEXT_ASSET_VALUES(
                finalAssetValues,
                assetSelector(finalAssetValues, getCurrPortfolioValue(i)),
                changePacket
            ), currAssetValues)
        )
    })(
        Math.floor((targetPortfolioValueChange - initChange) / changePacket),
        (i) => startPortfolioValue + initChange + (changePacket * i /** change to i - 1 for google sheets */)
    );

/**
 *
GOOGLE SHEETS TRANSLATION:

Extra parameter for optimization:
index_numbers                    ->    index_numbers         // used to reduce call to SEQUENCE and making new array every time.

Main parameters:
currAssetValues                 ->    curr_asset_values
initChange                      ->    init_change
assetSelector                   ->    asset_selector

NAMED RANGES:
startPortfolioValue             ->    portfolioValue    (named range)
targetPortfolioValueChange      ->    targetBuySell     (named range)
isSell                          ->    isSell            (named range)
changePacket                    ->    changePacket      (named range)

=LAMBDA(iterCount, getCurrPortfolioValue,
    LAMBDA(finalAssetValues,
        NEXT_ASSET_VALUES(
            index_numbers,
            finalAssetValues,
            asset_selector(finalAssetValues, getCurrPortfolioValue(iterCount)),
            portfolioValue + targetBuySell - getCurrPortfolioValue(iterCount)
        )
    )(
        IF(iterCount > 0,
            REDUCE(curr_asset_values, SEQUENCE(iterCount, 1, 0, 1),
                LAMBDA(runningAssetValues, i,
                    NEXT_ASSET_VALUES(
                        index_numbers,
                        runningAssetValues,
                        asset_selector(runningAssetValues, getCurrPortfolioValue(i)),
                        changePacket
                    )
                )
            ),
            curr_asset_values
        )
    )
)(
    FLOOR((targetBuySell - init_change) / changePacket),
    LAMBDA(i, portfolioValue + init_change + (changePacket * i))
)

=LET(
    iterCount,
        FLOOR((targetBuySell - init_change) / changePacket),
    getCurrPortfolioValue,
        LAMBDA(i, portfolioValue + init_change + (changePacket * i)),
    finalAssetValues,
        IF(iterCount > 0,
            REDUCE(curr_asset_values, SEQUENCE(iterCount, 1, 0, 1),
                LAMBDA(runningAssetValues, i,
                    NEXT_ASSET_VALUES(
                        index_numbers,
                        runningAssetValues,
                        asset_selector(runningAssetValues, getCurrPortfolioValue(i)),
                        changePacket
                    )
                )
            ),
            curr_asset_values
        ),
    NEXT_ASSET_VALUES(
        index_numbers,
        finalAssetValues,
        asset_selector(finalAssetValues, getCurrPortfolioValue(iterCount)),
        portfolioValue + targetBuySell - getCurrPortfolioValue(iterCount)
    )
)

*/
}

/**
 * @param {number[]} targetWeights
 * @param {number[]} startAssetValues
 * @param {number} startPortfolioValue
 * @param {number} targetPortfolioValueChange - positive if want to buy, negative if want to sell
 * @param {boolean} isSell
 * @param {(currAssetValues: number[], currPortfolioValue: number[]) => number[]} assetSelector
 * @param {number} changePacket
 */
function START_NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(
    targetWeights,
    startAssetValues,
    startPortfolioValue,
    targetPortfolioValueChange,
    isSell,
    assetSelector,
    changePacket
)
{
    return ((initTargetAssetIndex) =>
    {
        return ((initChange) =>
        {
            return NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(
                NEXT_ASSET_VALUES(startAssetValues, initTargetAssetIndex, initChange),
                startPortfolioValue,
                targetPortfolioValueChange,
                initChange,
                assetSelector,
                changePacket
            );
        })(
            GET_INIT_VALUE_CHANGE_DERIVED_FROM_TARGET_ASSET_VALUE_CHANGE_FOR_ITS_REBALANCE_VALUE_TO_BE_EQUAL_TO_ANOTHER_ASSETS_REBALANCE_VALUE(
                targetWeights,
                startAssetValues,
                startPortfolioValue,
                initTargetAssetIndex,
                targetPortfolioValueChange,
                isSell
            )
        )
    })(assetSelector(startAssetValues, startPortfolioValue));

/**
 *
GOOGLE SHEETS TRANSLATION:

Extra parameter for optimization:
index_numbers                    ->    index_numbers         // used to reduce call to SEQUENCE and making new array every time.

Main parameters:
targetWeights                   ->    target_weights
startAssetValues                ->    start_asset_values
assetSelector                   ->    asset_selector

NAMED RANGES:
startPortfolioValue             ->    portfolioValue    (named range)


=LAMBDA(initTargetAssetIndex,
    LAMBDA(initChange,
        NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(
            index_numbers,
            NEXT_ASSET_VALUES(
                index_numbers,
                start_asset_values,
                initTargetAssetIndex,
                initChange
            ),
            initChange,
            asset_selector
        )
    )(
        GET_INIT_VALUE_CHANGE_DERIVED_FROM_TARGET_ASSET_VALUE_CHANGE_FOR_ITS_REBALANCE_VALUE_TO_BE_EQUAL_TO_ANOTHER_ASSETS_REBALANCE_VALUE(
            index_numbers,
            target_weights,
            start_asset_values,
            initTargetAssetIndex
        )
    )
)(asset_selector(start_asset_values, portfolioValue))


=LET(
    initTargetAssetIndex,
        asset_selector(start_asset_values, portfolioValue),
    initChange,
        GET_INIT_VALUE_CHANGE_DERIVED_FROM_TARGET_ASSET_VALUE_CHANGE_FOR_ITS_REBALANCE_VALUE_TO_BE_EQUAL_TO_ANOTHER_ASSETS_REBALANCE_VALUE(
            index_numbers,
            target_weights,
            start_asset_values,
            initTargetAssetIndex
        ),
    NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(
        index_numbers,
        NEXT_ASSET_VALUES(
            index_numbers,
            start_asset_values,
            initTargetAssetIndex,
            initChange
        ),
        initChange,
        asset_selector
    )
)


*/
}

/** SHEETS ONLY FUNCTION DON'T USE WITH JS IMPL*/
function _IMPL_SINGLE_OPERATION_TRANSACTION()
{
/**
 *
GOOGLE SHEETS TRANSLATION:

Main parameters:
targetWeights                   ->    target_weights
startAssetValues                ->    start_asset_values

NAMED RANGES:
isSell

=LAMBDA(indexNumbers,
    LAMBDA(getWrappedAssetSelector,
        START_NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(
            indexNumbers,
            target_weights,
            start_asset_values,
            IF(isSell,
                getWrappedAssetSelector(GET_MOST_OVERWEIGHT_INDEX),
                getWrappedAssetSelector(GET_MOST_UNDERWEIGHT_INDEX)
            )
        )
    )(
        LAMBDA(assetSelector,
            LAMBDA(currAssetValues, currPortfolioValue,
                assetSelector(indexNumbers, target_weights, currAssetValues, currPortfolioValue)
            )
        )
    )
)(SEQUENCE(numberOfTickers))

=LET(
    indexNumbers,
        SEQUENCE(numberOfTickers),
    getWrappedAssetSelector,
        LAMBDA(assetSelector,
            LAMBDA(currAssetValues, currPortfolioValue,
                assetSelector(indexNumbers, target_weights, currAssetValues, currPortfolioValue)
            )
        ),
    START_NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(
        indexNumbers,
        target_weights,
        start_asset_values,
        IF(isSell,
            getWrappedAssetSelector(GET_MOST_OVERWEIGHT_INDEX),
            getWrappedAssetSelector(GET_MOST_UNDERWEIGHT_INDEX)
        )
    )
)
 */
}

function SINGLE_OPERATION_TRANSACTION(targetWeights, startAssetValues, portfolioValue, targetPortfolioValueChange, maxIter)
{
    if (targetPortfolioValueChange === 0) return startAssetValues.map(() => 0);
    if (-targetPortfolioValueChange >= portfolioValue) return startAssetValues.map(val, -val);
    if (startAssetValues.length <= 1) return [targetPortfolioValueChange];
    if (targetWeights.some((val) => val >= 1)) return targetWeights.map((val) => (val >= 1) ? val * targetPortfolioValueChange : 0);

    return START_NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(
        targetWeights,
        startAssetValues,
        portfolioValue,
        targetPortfolioValueChange,
        targetPortfolioValueChange < 0,
        (targetPortfolioValueChange < 0) ?
            (currAssetValues, currPortfolioValue) => GET_MOST_OVERWEIGHT_INDEX(targetWeights, currAssetValues, currPortfolioValue):
            (currAssetValues, currPortfolioValue) => GET_MOST_UNDERWEIGHT_INDEX(targetWeights, currAssetValues, currPortfolioValue)
        ,
        targetPortfolioValueChange / maxIter
    ).map((val, i) => val - startAssetValues[i]);

/**
GOOGLE SHEETS TRANSLATION:


targetWeights                   ->    target_weights
startAssetValues                ->    start_asset_values

portfolioValue              (named range)
targetBuySell               (named range)
numberOfTickers             (named range)
minOnlyBuyRebalance         (named range)
minOnlySellRebalance        (named range)

NOTE: minOnlySellRebalance will always be negative and minOnlyBuyRebalance will always be positive
since its calculated by changeInTotalPortfolioValueNeededForCurrentAssetValueToBeTargetWeight
and the main idea is that unless the portfolio is perfectly balanced (in which case both values
would be zero) the portfolio will always have a most over weight asset and a least over weight asset
and therefore changeInTotalPortfolioValueNeededForCurrentAssetValueToBeTargetWeight would always
result in this being true:
As long as the portfolio is NOT already balanced,
minOnlySellRebalance will always be negative and minOnlyBuyRebalance will always be positive

ALSO, have to check for COUNTIF(target_weights, ">=1") >= 1 since based on the formulas
used to calculate the initial asset value change (which is the key part of the fastSingleOperation
Algorithm), if one of the asset target weights is 100% it divides by zero. Thats a no go.

=IF(numberOfTickers <= 1,
    targetBuySell,
    IF(COUNTIF(target_weights, ">=1") >= 1,
        MAP(target_weights, LAMBDA(val, IF(val >= 1, val * targetBuySell, 0))),
        IF(targetBuySell = 0,
            SEQUENCE(numberOfTickers, 1, 0, 0),
            IF(-targetBuySell >= portfolioValue,
                MAP(start_asset_values, LAMBDA(val, -val)),
                IF(OR(targetBuySell >= minOnlyBuyRebalance, -targetBuySell >= -minOnlySellRebalance),
                    REBALANCE(target_weights, start_asset_values, portfolioValue + targetBuySell),
                    MAP(_IMPL_SINGLE_OPERATION_TRANSACTION(target_weights, start_asset_values), start_asset_values,
                        LAMBDA(endVal, startVal, endVal - startVal)
                    )
                )
            )
        )
    )
)
*/
}

const targetWeights = [
    17.17 / 100,
    22.86 / 100,
    5.00 / 100,
    15.03 / 100,
    19.89 / 100,
    5.03 / 100,
    10.03 / 100,
    5.00 / 100,
];
const assetValues = [
    78828.22,
    77452.48,
    19752.72,
    56320.00,
    45820.90,
    20154.13,
    32780.30,
    12614.68,
];
const portfolioValue = assetValues.reduce((sum, val) => sum + val, 0);
const moneyToInvest = 125000;
const moneyToExtract = -18000;

SINGLE_OPERATION_TRANSACTION(
    targetWeights,
    assetValues,
    portfolioValue,
    moneyToInvest,
    1000
); // ?
