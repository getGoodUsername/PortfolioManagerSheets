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
 */

/**
 * HELPER NAMED FUNCTIONS & constants / named ranges:
 * 
 * SLICE = OFFSET(range, start - 1, 0, 1 + end - start)
 * 
 * targetBuySell                - user input, > 0 means buy, < 0 means sell.
 * portfolioValue               - sum of current value of assets in the google sheet
 * numberOfTickers              - named range, number of assets/tickers
 * minOnlyBuyRebalance          - min value so rebalance will result in ONLY BUY operation transaction
 * minOnlySellRebalance         - min value so rebalance will result in ONLY SELL operation transaction
 * maxSingleOpTransactionIter   - max number of internal MAIN loops, the bigger the number, the longer the function takes but also the more accurate.
 * changePacket                 - targetBuySell / maxSingleOpTransactionIter (the discrete size of the change of an asset per operation)
 * 
 */


function GET_MOST_UNDERWEIGHT_INDEX(currRebalance)
{
    return currRebalance
        .reduce((underWeightIndex, val, i /** use sequence to get index of current iter */) =>
            (val > currRebalance[underWeightIndex]) ? i : underWeightIndex
            , 0 /** default value would be 1 in google sheets */
        );

/**
GOOGLE SHEETS TRANSLATION:

currRebalance -> curr_rebalance

=REDUCE(1, SEQUENCE(numberOfTickers),
    LAMBDA(underWeightIndex, i,
        IF(INDEX(curr_rebalance, i) > INDEX(curr_rebalance, underWeightIndex),
            i,
            underWeightIndex
        )
    )
)
*/
}

function GET_MOST_OVERWEIGHT_INDEX(currRebalance)
{
    return currRebalance
    .reduce((overWeightIndex, val, i /** use sequence to get index of current iter */) =>
        (val < currRebalance[overWeightIndex]) ? i : overWeightIndex
        , 0 /** default value would be 1 in google sheets */
    );

/**
GOOGLE SHEETS TRANSLATION:

currRebalance -> curr_rebalance

=REDUCE(1, SEQUENCE(numberOfTickers),
    LAMBDA(overWeightIndex, i,
        IF(INDEX(curr_rebalance, i) < INDEX(curr_rebalance, overWeightIndex),
            i,
            overWeightIndex
        )
    )
)
*/
}

function _IMPL_NEXT_ASSET_VALUES(currAssetValues, changeIndex, changePacket)
{
    if (changeIndex === 0) // would check for 1 in google sheets
    {
        return [currAssetValues[changeIndex] + changePacket, ...currAssetValues.slice(1)];
    }

    if (changeIndex === currAssetValues.length - 1) // sheets would just be assetValues.length aka only COUNTA(assetValues) aka numberOfTickers
    {
        return [
            ...currAssetValues.slice(0, changeIndex),
            currAssetValues[changeIndex] + changePacket
        ];
    }

    return [
        ...currAssetValues.slice(0, changeIndex),
        currAssetValues[changeIndex] + changePacket,
        ...currAssetValues.slice(changeIndex + 1) /** would also have to additionally check for when underWeightIndex is assetValues.length, since + 1 would be invalid in sheets */
    ];


/**
GOOGLE SHEETS TRANSLATION:

currAssetValues     ->    curr_asset_values
changeIndex         ->    change_index

numberOfTickers             (named range)
changePacket                (named range)

=IF(change_index = 1,
    {
        INDEX(curr_asset_values, 1) + changePacket;
        SLICE(curr_asset_values, 2, numberOfTickers)
    },
    IF(change_index = numberOfTickers,
        {
            SLICE(curr_asset_values, 1, numberOfTickers - 1);
            INDEX(curr_asset_values, numberOfTickers) + changePacket
        },
        {
            SLICE(curr_asset_values, 1, change_index - 1);
            INDEX(curr_asset_values, change_index) + changePacket;
            SLICE(curr_asset_values, change_index + 1, numberOfTickers)
        }
    )
)
*/
}


/**
 * 
 * @param {number[]} targetWeights
 * @param {number[]} currAssetValues
 * @param {number} currPortfolioValue
 * @param {number} changePacket
 * @param {(currRebalance: number[]) => number} assetSelector
 */
function NEXT_ASSET_VALUES(targetWeights, currAssetValues, currPortfolioValue, changePacket, assetSelector)
{
    return _IMPL_NEXT_ASSET_VALUES(
        currAssetValues,
        assetSelector(rebalance(targetWeights, currAssetValues, currPortfolioValue)),
        changePacket
    );

/**
GOOGLE SHEETS TRANSLATION:

targetWeights           ->    target_weights
currAssetValues         ->    curr_asset_values
currPortfolioValue      ->    curr_portfolio_value
assetSelector           ->    asset_selector

=_IMPL_NEXT_ASSET_VALUES(
    curr_asset_values,
    asset_selector(REBALANCE(target_weights, curr_asset_values, curr_portfolio_value)), 
)
*/
}

/**
 * 
 * @param {number[]} targetWeights
 * @param {number[]} currAssetValues
 * @param {number} currPortfolioValue
 * @param {number} changePacket
 * @param {number} maxIter
 * @param {(currRebalance: number[]) => number} assetSelector
 * @param {number} currIter
 * @returns {number[]} - asset values
 */
function MAIN_LOOP_SINGLE_OPERATION_TRANSACTION(targetWeights, currAssetValues, currPortfolioValue, changePacket, maxIter, assetSelector, currIter)
{
    if (currIter < maxIter)
    {
        return MAIN_LOOP_SINGLE_OPERATION_TRANSACTION(
            targetWeights,
            NEXT_ASSET_VALUES(targetWeights, currAssetValues, currPortfolioValue, changePacket, assetSelector),
            currPortfolioValue + changePacket,
            changePacket,
            maxIter,
            assetSelector,
            currIter + 1
        );
    }

    return currAssetValues;

/**
GOOGLE SHEETS TRANSLATION:

targetWeights           ->    target_weights
currAssetValues         ->    curr_asset_values
currPortfolioValue      ->    curr_portfolio_value
assetSelector           ->    asset_selector
currIter                ->    curr_iter

maxSingleOpTransactionIter  (named range)
changePacket                (named range)

=IF(curr_iter < maxSingleOpTransactionIter,
    MAIN_LOOP_SINGLE_OPERATION_TRANSACTION(
        target_weights,
        NEXT_ASSET_VALUES(target_weights, curr_asset_values, curr_portfolio_value, asset_selector),
        curr_portfolio_value + changePacket,
        asset_selector,
        curr_iter + 1
    ),
    curr_asset_values
)

*/
}

/**
 * 
 * @param {number[]} targetWeights
 * @param {number[]} assetValues
 * @param {number} portfolioValue
 * @param {number} targetPortfolioValueChange - positive if want to buy, negative if want to sell
 * @param {number} maxIter 
 */
function NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(targetWeights, assetValues, portfolioValue, targetPortfolioValueChange, maxIter)
{
    return MAIN_LOOP_SINGLE_OPERATION_TRANSACTION(
        targetWeights,
        assetValues,
        portfolioValue,
        targetPortfolioValueChange / maxIter,
        maxIter,
        (targetPortfolioValueChange > 0) ? GET_MOST_UNDERWEIGHT_INDEX : GET_MOST_OVERWEIGHT_INDEX,
        0
    ).map((val, i) => val - assetValues[i]);

/**
GOOGLE SHEETS TRANSLATION:

targetWeights                   ->    target_weights
assetValues                     ->    asset_values

portfolioValue              (named range)
targetBuySell               (named range)
numberOfTickers             (named range)
maxSingleOpTransactionIter  (named range)
changePacket                (named range)


=MAP(
    MAIN_LOOP_SINGLE_OPERATION_TRANSACTION(
        target_weights,
        asset_values,
        portfolioValue,
        IF(targetBuySell > 0, GET_MOST_UNDERWEIGHT_INDEX, GET_MOST_OVERWEIGHT_INDEX),
        0
    ),
    asset_values,
    LAMBDA(newValue, value, newValue - value)
)
*/
}


function SINGLE_OPERATION_TRANSACTION(targetWeights, assetValues, portfolioValue, targetPortfolioValueChange, maxIter)
{
    if (targetPortfolioValueChange === 0) return assetValues.map(() => 0);
    if (-targetPortfolioValueChange >= portfolioValue) return assetValues.map(val, -val);
    if (assetValues.length <= 1) return [targetPortfolioValueChange];
    if (targetWeights.some((val) => val >= 1)) return targetWeights.map((val) => (val >= 1) ? val * targetPortfolioValueChange : 0);

    return NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(targetWeights, assetValues, portfolioValue, targetPortfolioValueChange, maxIter)

/**
GOOGLE SHEETS TRANSLATION:

targetWeights                   ->    target_weights
assetValues                     ->    asset_values

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

=IF(targetBuySell = 0,
    SEQUENCE(numberOfTickers, 1, 0, 0),
    IF(-targetBuySell >= portfolioValue,
        MAP(asset_values, LAMBDA(val, -val)),
        IF(numberOfTickers <= 1,
            targetBuySell,
            IF(COUNTIF(target_weights, ">=1") >= 1,
                MAP(target_weights, LAMBDA(val, IF(val >= 1, val * targetBuySell, 0))),
                IF(OR(targetBuySell >= minOnlyBuyRebalance, -targetBuySell >= -minOnlySellRebalance),
                    REBALANCE(target_weights, asset_values, portfolioValue + targetBuySell),
                    NON_ERROR_CHECKING_SINGLE_OPERATION_TRANSACTION(target_weights, asset_values)
                )
            )
        )
    )
)
*/
}

const targetWeights = [
    17.30 / 100,
    22.75 / 100,
    5.00 / 100,
    15.05 / 100,
    19.81 / 100,
    5.05 / 100,
    7.05 / 100,
    8.00 / 100,
];
const assetValues = [
    78105.59,
    75403.53,
    19251.15,
    55380.00,
    46293.53,
    20394.50,
    32114.35,
    12801.12,
];
const portfolioValue = assetValues.reduce((sum, val) => sum + val, 0);
const moneyToInvest = 12500;
const moneyToExtract = -18000;

SINGLE_OPERATION_TRANSACTION(targetWeights, assetValues, portfolioValue, moneyToInvest, 1000); // ?.