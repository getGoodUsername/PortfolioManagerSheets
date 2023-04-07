/**
 * Make object representation of portfolio
 *
 * @param {string[]} tickers
 * @param {number[]} targetWeights in percents
 * @param {number[]} assetValues
 * @returns
 */
function makePortfolio(tickers, targetWeights, assetValues)
{
    let totalValue = assetValues.reduce((runningSum, val) => runningSum + val, 0);
    const assetTickerMap = new Map();
    const assets = tickers.map((ticker, index) =>
    {
        let currentValue = assetValues[index];
        const targetWeight = targetWeights[index];
        const assetObj = {
            get name() { return ticker; },
            get targetWeight() { return targetWeight; },
            get deltaFromIdeal() { return (targetWeight * totalValue) - currentValue; },
            get currentWeight() { return currentValue / totalValue; },
            get currentValue() { return currentValue; },
            set currentValue(newValue)
            {
                const valueChange = newValue - currentValue;
                totalValue += valueChange;
                currentValue = newValue;
            },
        };

        assetTickerMap.set(assetObj.name, assetObj);
        return assetObj;
    });

    const portfolio = {
        get totalValue() { return totalValue; },
        get assets() { return assets; },

        /**
         *
         * @param {string} ticker
         * @returns {{
         * readonly name: string;
         * readonly targetWeight: number;
         * readonly deltaFromIdeal: number;
         * readonly currentWeight: number;
         * currentValue: number;
         * }}
         */
        getAssetByTicker(ticker)
        {
            return assetTickerMap.get(ticker);
        },

        // if performance ever becomes more important, consider using a max/min heap
        get mostOverWeightAsset()
        {
            return assets.reduce((mostOverWeight, asset) => (mostOverWeight.deltaFromIdeal < asset.deltaFromIdeal) ? mostOverWeight : asset);
        },

        get mostUnderWeightAsset()
        {
            return assets.reduce((mostUnderWeight, asset) => (mostUnderWeight.deltaFromIdeal > asset.deltaFromIdeal) ? mostUnderWeight : asset);
        },

        log(logger = console.log) // eslint-disable-line no-console
        {
            portfolio.assets.forEach((asset) => logger(Object.entries(asset)));
            logger(`total value: ${portfolio.totalValue}`);
        },
    };

    return portfolio;
}

/**
 * Returns an array instructing exactly how much to buy
 * of each asset in order to get as close as possible to
 * the desired input weights tax efficiently. There
 * will never be an instruction to sell, ONLY buy.
 * (inputs are all single columns
 * multiple rows except for moneyToInvest)
 *
 * @param {string[][]} tickers
 * @param {number[][]} targetWeights in percents
 * @param {number[][]} assetValues
 * @param {number} moneyToInvest
 * @returns {number[][]}
 * @customfunction
 */
function onlyBuyRebalance(tickers, targetWeights, assetValues, moneyToInvest, maxIter = 1000)
{
    // all single scalar values, meaning there is only one asset
    // meaning that there is no calculation to be done, just put
    // everything in that one asset.
    if ([tickers, targetWeights, assetValues].filter(Array.isArray).length === 0) { return moneyToInvest; }

    tickers = tickers.flat();
    targetWeights = targetWeights.flat();
    assetValues = assetValues.flat();

    const portfolio = makePortfolio(tickers, targetWeights, assetValues);
    const isEasyBuy = (investment) =>
    {
        /**
         * TLDR: looking for the hardest asset to rebalance and
         * seeing if we can do it with "investment" param.
         *
         * A quick note about deltaFromIdeal, if the current asset
         * is overweigh, then the deltaFromIdeal will be negative,
         * and the opposite is true.
         * 
         * The essential piece of information to understand is how
         * we go about re-balancing and why? I believe it will make more
         * sense what is going on here. As a side note, use portfolio.log()
         * to see these ideas in action.
         * 
         * The most basic idea is to find the asset with the biggest
         * delta from the ideal, where the ideal is defined as the value
         * such that the asset value / total value of portfolio is equal
         * to the target weight. Why not use the delta from ideal weight
         * of an asset (aka asset weight - target asset weight)?
         * Well this is because this value by itself ignores
         * the actual investment amount needed to get to ideal values. Thats
         * why we don't compare weight, but instead we compare values.
         * 
         * The big catch of deltaFromIdeal is that it's value does not take
         * into account that any change to an asset value also changes
         * the total portfolio value. This is a problem since the weight
         * of an asset is not defined by its value solely, but
         * also by the total portfolio value. This also means any change to an
         * asset's value, assuming all the other values stay constant, will
         * affect the weight of not only the changing asset but also every
         * other asset.
         * 
         * My original idea to account for this is what I think is a pretty
         * straight forward idea based on the circumstances. Make a
         * system of equation based on the idea that the actual way to model
         * the resulting weight of an asset is (current asset value + investment)
         * divided by (current portfolio value + the SUM of all investments to
         * every other asset + the investment to the current asset). After
         * some manipulation, it becomes more obvious that the right tool
         * for the job is using some linear algebra to solve for each
         * investment for each asset. This though will just do an inplace
         * rebalance. In order to avoid this all you need to do is add
         * another equation to the system of equations: the SUM of all
         * the investments = whatever you want to invest. (you might
         * notice that this is no longer a square matrix, but there is an
         * easy fix to this by adding zeros on the last colum of every row
         * except for the last row where you add a 1 to keep as an identity
         * matrix which allows for easy calculation, and more). And this worked
         * wonderfully! It was correct and it worked well. Well it worked
         * well in the case where enough investment was given in order to
         * fully buy (or at least not sell) all assets. This was a problem,
         * since I specifically didn't want to sell due to tax reasons. The
         * only way to have fixed that is to add yet another equation to the
         * system of equations, but this didn't really work because it
         * was not a normal equation, it had to involve a conditional
         * statement (>= 0) which don't pair with linear algebra as far as I know.
         * But whatever, thats besides the point because
         * there was a better way to go about solving the problem that is
         * truthfully better in every way.
         * 
         * Well the next idea was to just do this iteratively. But while
         * playing around with the previous solution, I realized that
         * there was some sort of pattern, and I could predict what the
         * minimum investment value to have the previous solution present
         * all investment additions as positive, and therefore not recommend
         * to sell. Moving forward though, the thing I realized
         * from the previous solution is that you could model what its output
         * would be without having to run through all the linear algebra.
         * Remember that the output of the previous solution told you
         * how much to invest/sell of assent[n] in order to get the exactly the
         * correct weights for each asset. Well the shortcut was modeled as:
         * (money to invest into portfolio * target weight for asset[n])
         * + (current portfolio value * target weight for asset[n]) - current
         * value for asset[n]. Simplified, take the money you want to invest
         * inside the portfolio, split it according to the target weights
         * for each asset and add deltaFromIdeal to get how much to buy/sell
         * of every asset. As to why this works, note that now the new value
         * of asset[n] is defined as (target weight for asset[n] * previous
         * total portfolio value) + (money to invest into portfolio
         * * target weight for asset[n]).
         * Note about "previous total portfolio value"; recall that the total
         * portfolio value is defined as the sum of the values of all the assets,
         * and therefore since the value of all assets have changed, I want to
         * make it clear that I'm using the portfolio value previous to the assets
         * changing. Moving on, I still think it might be hard to see. Until
         * you try to model what the weight of the new asset is. Well, take
         * the new value of the asset and divide it by the new total portfolio
         * value, which is now the money to invest into portfolio + the previous
         * total portfolio value and what do you know, by definition, the result
         * is always the target weight of of asset n! Here is a picture of the
         * math if you are still confused: https://photos.app.goo.gl/rU5cPmNujesJrzgf9
         * Another way to think about it is that you are first doing an inplace
         * rebalance (total portfolio value * target weight[n]) and then just
         * adding the money you want to invest in a way that won't adjust the
         * asset's weights, aka (money to invest * target weight[n]) and then
         * you just subtract from that the current asset value to get the change
         * in asset value instead of the new asset value.
         * 
         * Well what does have to do with predicting the minimum investment
         * value for the special situation where it is all buys with the
         * previous solution. Well, notices that from these equations, we can
         * also solve for how much "money to invest" into the portfolio, based
         * on the values we already know. For how this is done look at this
         * picture: https://photos.app.goo.gl/uTstRAZtTgrV6eTC8
         * As the math in the picture says, we end up choosing the "money to
         * invest" that will result in a positive change in each asset's value
         * and therefore the largest money to invest value. And that finally
         * leads us to the code right below us. deltaFromIdeal is defined
         * as (target weight for asset[n] * total portfolio value) - asset[n]
         * value. As seen from the math in the picture, we know know that
         * the money to invest for asset n is -deltaFromIdea / targetWeight.
         * 
         * Boom! Done.
         * And just a note, all these ideas apply to the sell only rebalance,
         * just in the opposite direction.
         * Also at the end of the day, this function, isEasyBuy, is an optimization
         * enabler, in order to not to do the iterative manual way that is done
         * with the main for loop of the onlyBuyRebalance function.
         */
        const minInvestment = Math.max(...portfolio.assets.map(({ deltaFromIdeal, targetWeight }) => -deltaFromIdeal / targetWeight));
        return investment >= minInvestment;
    };

    if (isEasyBuy(moneyToInvest))
    {
        // look at the long ass explanation in isEasyBuy to understand why this works.
        const baseBuy = targetWeights.map((weight) => weight * moneyToInvest);
        return baseBuy.map((value, index) => value + portfolio.getAssetByTicker(tickers[index]).deltaFromIdeal);
    }

    const investmentPacket = moneyToInvest / maxIter;
    for (let i = 0; i < maxIter; i += 1)
    {
        portfolio.mostUnderWeightAsset.currentValue += investmentPacket;
    }

    return tickers.map((ticker, index) => [portfolio.getAssetByTicker(ticker).currentValue
    - assetValues[index]]);
}

/**
 * Returns an array instructing exactly how much to sell
 * of each asset in order to get as close as possible to
 * the desired input weights tax efficiently. There
 * will never be an instruction to buy, ONLY sell.
 * (inputs are all single columns
 * multiple rows except for moneyToExtract which is expected
 * to be a positive number)
 *
 * @param {string[][]} tickers
 * @param {number[][]} targetWeights in percents
 * @param {number[][]} assetValues
 * @param {number} moneyToExtract positive
 * @returns {number[][]}
 * @customfunction
 */
function onlySellRebalance(tickers, targetWeights, assetValues, moneyToExtract, maxIter = 1000)
{
    // all single scalar values, meaning there is only one asset
    // meaning that there is no calculation to be done, just remove
    // everything from that one asset.
    if ([tickers, targetWeights, assetValues].filter(Array.isArray).length === 0) { return -moneyToExtract; }

    tickers = tickers.flat();
    targetWeights = targetWeights.flat();
    assetValues = assetValues.flat();

    const portfolio = makePortfolio(tickers, targetWeights, assetValues);
    if (moneyToExtract >= portfolio.totalValue) {return assetValues.map((val) => [-val]);}

    const isEasySell = (extraction) =>
    {
        // looking for the hardest asset to rebalance from base rates
        const minExtraction = Math.min(...portfolio.assets.map(({ deltaFromIdeal, targetWeight }) => -deltaFromIdeal / targetWeight));
        return -extraction <= minExtraction;
    };

    if (isEasySell(moneyToExtract))
    {
        const baseSell = targetWeights.map((weight) => weight * -moneyToExtract);
        return baseSell.map((value, index) => value + portfolio.getAssetByTicker(tickers[index]).deltaFromIdeal);
    }

    const extractionPacket = moneyToExtract / maxIter;
    for (let i = 0; i < maxIter; i += 1)
    {
        portfolio.mostOverWeightAsset.currentValue -= extractionPacket;
    }

    return tickers.map((ticker, index) => [portfolio.getAssetByTicker(ticker).currentValue
    - assetValues[index]]);
}

/**
 * Returns a number such that after doing an "inplace" rebalance
 * in the portfolio, where total value doesn't change and selling
 * is allowed, the number can be portioned out into its correct
 * weights and nullify even the  hardest to rebalance asset, note
 * though that this asset is not necessarily the most overweight
 * though it tends to be. (inputs are all single columns
 * multiple rows)
 *
 * @param {number[][]} targetWeights in percents
 * @param {number[][]} assetValues
 * @customfunction
 */
function minInvestmentForFullBuyRebalance(targetWeights, assetValues)
{
    // only one asset in entire account, obviously the minimum for
    // a full buy rebalance would be 0.
    if ([targetWeights, assetValues].filter(Array.isArray).length === 0) { return 0; }

    targetWeights = targetWeights.flat();
    assetValues = assetValues.flat();

    const totalValue = assetValues.reduce((runningSum, val) => runningSum + val, 0);
    const getDeltaFromIdeal = (targetWeight, currentValue) => (targetWeight * totalValue) - currentValue; // eslint-disable-line max-len
    const minInvestmentPerAsset = targetWeights.map((weight, index) => -getDeltaFromIdeal(weight, assetValues[index]) / weight);

    return Math.max(...minInvestmentPerAsset);
}

/**
 * Returns a number such that after doing an "inplace" rebalance
 * in the portfolio, where total value doesn't change and buying
 * is allowed, the number can be portioned out into its correct
 * weights and nullify even the  hardest to rebalance asset, note
 * though that this asset is not necessarily the most underweight
 * though it tends to be. (inputs are all single columns
 * multiple rows)
 *
 * @param {number[][]} targetWeights in percents
 * @param {number[][]} assetValues
 * @customfunction
 */
function minInvestmentForFullSellRebalance(targetWeights, assetValues)
{
    // only one asset in entire account, obviously the minimum for
    // a full sell rebalance would be 0.
    if ([targetWeights, assetValues].filter(Array.isArray).length === 0) { return 0; }

    targetWeights = targetWeights.flat();
    assetValues = assetValues.flat();

    const totalValue = assetValues.reduce((runningSum, val) => runningSum + val, 0);
    const getDeltaFromIdeal = (targetWeight, currentValue) => (targetWeight * totalValue) - currentValue; // eslint-disable-line max-len
    const minExtractionPerAsset = targetWeights.map((weight, index) => -getDeltaFromIdeal(weight, assetValues[index]) / weight);

    return Math.min(...minExtractionPerAsset);
}


/**
 * Useful IF WHOLE PORTFOLIO is in some sort of TAX ADVANTAGED ACCOUNT
 * such as a 401k, IRA, Roth IRA, etc.
 * Will get you to your target weights immediately.
 * 
 * @param {number[][]} targetWeights in percents
 * @param {number[][]} assetValues
 * @param {number} targetBuySell
 * @customfunction
 */
function fullRebalanceNow(targetWeights, assetValues, targetBuySell)
{
    if ([targetWeights, assetValues].filter(Array.isArray).length === 0) { return 0; }

    targetWeights = targetWeights.flat();
    assetValues = assetValues.flat();

    const totalValue = assetValues.reduce((runningSum, val) => runningSum + val, 0) + targetBuySell;

    // selling off entire portfolio
    if (totalValue <= 0) return assetValues.map((val) => [-val]);

    const getDeltaFromIdeal = (targetWeight, currentValue) => (targetWeight * totalValue) - currentValue; // eslint-disable-line max-len
    return assetValues.map((currentValue, index) => [getDeltaFromIdeal(targetWeights[index], currentValue)]);
}

/**
 * Calculate how many shares you have, taking into account stock splits.
 * Expect shareDates and stockSplitDates to be sorted in ascending order.
 * In addition expect shareDates.length === shareCounts.length
 * and stockSplitDates.length === splitRatios.length
 * 
 * @param {Date[][]} shareDates
 * @param {number[][]} shareCounts
 * @param {Date[][]} [stockSplitDates]
 * @param {number[][]} [splitRatios]
 * @returns {number}
 * @customfunction
 */
function getShareCount(shareDates, shareCounts, stockSplitDates, splitRatios)
{
    // make easier to work with. the whole [x].flat(2) is to ensure
    // array interface even when inputs are scalar values and .flat(2)
    // is to ensure even [[[1], [2]]] will turn to [1, 2]
    shareDates = [shareDates].flat(2);
    shareCounts = [shareCounts].flat(2);
    stockSplitDates = [stockSplitDates].flat(2);
    splitRatios = [splitRatios].flat(2);

    let result = 0;
    let splitPtr = 0;
    for (let i = 0; i < shareCounts.length; i += 1)
    {
        /**
         * apply all the stock splits to the previous shares. Works
         * only if both shareDates  and stockSplitDates are sorted in
         * ascending order, which they should be
         * Note that I check for >= since stock splits only affect
         * shares that were bought previous to that day, so
         * I want to not only apply the split to the previous shares
         * but also avoid applying the stock split to any shares
         * bought on the same day as the split
         */
        for (; splitPtr < stockSplitDates.length && shareDates[i] >= stockSplitDates[splitPtr]; splitPtr += 1)
        {
            result *= splitRatios[splitPtr];
        }
        result += shareCounts[i];
    }

    // in case stockSplitDates[-1] > shareDates[-1]
    for (; splitPtr < stockSplitDates.length; splitPtr += 1)
    {
        result *= splitRatios[splitPtr];
    }

    return result;
}