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


































function throwHandler(funcToRun)
{
  const result = [null, null];
  try
  {
    result[0] = funcToRun();
  } catch (e)
  {
    result[1] = e;
  }

  return result;
}

/**
 * @param {SpreadsheetApp.Sheet} sheet
 */
function isAssetTrackerSheet(sheet)
{
  return sheet.getRange('isAsset').getValue() === true;
}

/**
 * returns all asset tracker sheets.
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss 
 * @returns {SpreadsheetApp.Sheet[]}
 */
function getAssetTrackerSheets(ss)
{
  return ss.getSheets().filter(isAssetTrackerSheet);
}

/**
 * returns object in shape of {.ticker}
 * where the ticker is always fully capitalized,
 * and the weight is always in percent (num / 100).
 * 
 * WILL THROW, in the event of user canceling/quitting
 * from the prompts spawned within the function.
 * 
 * @param {SpreadsheetApp.Spreadsheet} ss 
 * @returns 
 */
function getNewAsset(ss)
{
  const ui = SpreadsheetApp.getUi();
  const promptUser = (titleStr, promptStr) =>
  {
    const response = ui.prompt(titleStr, promptStr, ui.ButtonSet.OK_CANCEL);

    const buttonClicked = response.getSelectedButton();
    const isCanceled = buttonClicked === ui.Button.CANCEL;
    const isClosed = buttonClicked === ui.Button.CLOSE;
    if (isCanceled) throw Error('User canceled new asset prompt');
    if (isClosed) throw Error('User closed new asset prompt');

    return response.getResponseText();
  };
  const alertUser = (errorMsg) => {ui.alert(errorMsg);};
  const newAsset = {};

  newAsset.ticker = (() =>
  {
    const isUniqueNewTicker = (() =>
    {
      // most times the name of the asset sheet will eq the ticker in it due to the 
      // 'make asset changes live' mechanism, but even if they aren't, the sheet
      // name is the most important to avoid naming conflicts between existing
      // sheet and the new sheet that will probably be made with this new asset info
      const tickerNamesSet = new Set(getAssetTrackerSheets(ss).map((sheet) => sheet.getName()));
      return (ticker) => !tickerNamesSet.has(ticker);
    })();

    const ssName = ss.getName();
    while (true)
    {
      const ticker = promptUser(`Adding a new asset to Account manager "${ssName}".`, 'Ticker:').toUpperCase();
      if (isUniqueNewTicker(ticker)) return ticker;
      alertUser(`${ticker} is already in ${ssName}!!!!`);
    }
  })();

  return newAsset;
}

/**
 * Adds a new sheet for a new asset
 * 
 */
function addNewAssetTrackerSheet()
{
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const [asset, error] = throwHandler(() => getNewAsset(ss));

  if (error != null)
  {
    ss.toast(error.message);
    return;
  }

  const URLAssetTrackerTemplateSheet = 'https://docs.google.com/spreadsheets/d/1kO9jyMnfkHDF8_LDr3iWGevhmx8DJsChvPySMgmAT5I/edit?usp=sharing';

  const assetTrackerTemplateSpreadSheet = SpreadsheetApp.openByUrl(URLAssetTrackerTemplateSheet);
  const templateSheet = assetTrackerTemplateSpreadSheet.getSheets()[0];

  // for OAUTH reasons have copy: https://stackoverflow.com/questions/13677716/cant-insert-sheet
  const newAssetTrackerSheet = templateSheet.copyTo(ss);
  newAssetTrackerSheet.getRange('ticker').setValue(asset.ticker);
  newAssetTrackerSheet.setName(asset.ticker);
  ss.toast(`${asset.ticker} added!!! Remember to set new asset weight and make asset changes live!`, asset.ticker, -1);
}

/**
 * @typedef {Object} AccountManagerSheetTypes
 * @property {SpreadsheetApp.Sheet} mainSheet
 * @property {SpreadsheetApp.Sheet[]} assetTrackerSheets
 */

/**
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @returns {AccountManagerSheetTypes}
 */
function getAccountManagerSheetTypes(ss)
{
  let mainSheet;
  const assetTrackerSheets = [];
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i += 1)
  {
    const sheet = sheets[i];
    if (isAssetTrackerSheet(sheet)) assetTrackerSheets.push(sheet);
    else mainSheet = sheet;
  }

  return {mainSheet, assetTrackerSheets}
}

/**
 * @param {SpreadsheetApp.Spreadsheet} ss 
 * @param {SpreadsheetApp.Sheet} mainSheet
 */
function updateSpreadSheetName(ss, mainSheet)
{
  mainSheet
    .getRange('accountName')
    .setValue(ss.getName());
}

/**
 * @param {SpreadsheetApp.Sheet[]} assetTrackerSheets
 */
function updateAssetTrackerSheetsName(assetTrackerSheets, tickers)
{
    assetTrackerSheets.forEach((sheet, i) =>  sheet.setName(tickers[i]));
}

/**
 * @param {SpreadsheetApp.Spreadsheet} ss 
 * @param {SpreadsheetApp.Sheet} mainSheet
 * @param {string[]} tickers
 */
function updateInvestmentTotals(ss, mainSheet, tickers)
{
  mainSheet
    .getRange('accountTotalInvestedThisYear')
    .setValue(tickers.reduce((result, ticker) => result + ss.getRange(`${ticker}!totalInvestedThisYear`).getValue(), 0));
  mainSheet
    .getRange('lifetimeAccountTotalInvested')
    .setValue(tickers.reduce((result, ticker) => result + ss.getRange(`${ticker}!totalInvestment`).getValue(), 0));
}


/**
 * @param {SpreadsheetApp.Sheet} mainSheet
 */
function clearTickers(mainSheet)
{
  const prevMainTickersRange = mainSheet.getRange('A4:A');
  const prevTargetWeightPathTickersRange = mainSheet.getRange('L4:L');
  prevMainTickersRange.clearContent();
  prevTargetWeightPathTickersRange.clearContent();
}

/**
 * @param {SpreadsheetApp.Sheet} mainSheet
 */
function clearAssetValues(mainSheet)
{
  const prevAssetValuesRange = mainSheet.getRange('D4:D');
  prevAssetValuesRange.clearContent();
}

/**
 * @param {SpreadsheetApp.Sheet} mainSheet
 */
function clearAssetTargetWeights(mainSheet)
{
  const prevAssetTargetWeights = mainSheet.getRange('B4:B');
  prevAssetTargetWeights.clearContent();
}

/**
 * @param {SpreadsheetApp.Sheet} mainSheet
 * @param {string[]} tickers
 */
function addTickersToMainSheet(mainSheet, tickers)
{
  const tickerColumn = tickers.map((ticker) => [ticker]);
  const mainTickersRange = mainSheet.getRange(`A4:A${4 + tickers.length - 1}`);
  const targetWeightPathTickersRange = mainSheet.getRange(`L4:L${4 + tickers.length - 1}`);
  mainTickersRange.setValues(tickerColumn);
  targetWeightPathTickersRange.setValues(tickerColumn);
}

/**
 * @param {SpreadsheetApp.Sheet} mainSheet
 * @param {number[]} assetValues
 */
function addAssetValuesToMainSheet(mainSheet, assetValues)
{
  const assetValueColumn = assetValues.map((val) => [val]);
  const assetValuesRange = mainSheet.getRange(`D4:D${4 + assetValues.length - 1}`);
  assetValuesRange.setValues(assetValueColumn);
}

/**
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {SpreadsheetApp.Sheet} mainSheet
 * @returns {Date}
 */
function getAccountManagerSpreadSheetDateOfInception(ss, mainSheet)
{
  const [[customStartDate], [isEnabled]] = mainSheet.getRange('Z2:Z3').getValues();
  if (isEnabled) return customStartDate;

  const accountManagerSpreadSheet = DriveApp.getFileById(ss.getId());
  return accountManagerSpreadSheet.getDateCreated();
}

/**
 * 
 * @param {number[]} startWeights - all in percents, sum totaling up to 100%
 * @param {number[]} finalWeights - all in percents, sum totaling up to 100%
 * @param {Date} startDate - date when target weight is equal to start weights
 * @param {Date} endDate - date when target weight is equal to final weights, must be greater than or equal to startDate
 * @returns {number[]}
 */
function getTargetWeights(startWeights, finalWeights, startDate, endDate)
{
    const toDays = (milliseconds) => Math.floor(milliseconds / 1000 / 60 / 60 / 24);
    const dayNow = toDays(Date.now());
    const dayStart = toDays(startDate.getTime())
    const dayEnd = toDays(endDate.getTime());

    if (dayNow === dayStart) return startWeights;
    if (dayNow >= dayEnd) return finalWeights;

    const daysFromStartToEnd = dayEnd - dayStart;
    const daysElapsedSinceStart = dayNow - dayStart; // ?
    const diffPacket = (i) => (finalWeights[i] - startWeights[i]) / daysFromStartToEnd;
    const diff = (i) => diffPacket(i) * daysElapsedSinceStart;

    return startWeights.map((val, i) => val + diff(i));
}


/**
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {SpreadsheetApp.Sheet} mainSheet
 * @param {number} assetCount
 */
function addAssetTargetWeights(ss, mainSheet, assetCount)
{
  const startWeights = mainSheet.getRange(`M4:M${4 + assetCount - 1}`).getValues().flat();
  const finalWeights = mainSheet.getRange(`N4:N${4 + assetCount - 1}`).getValues().flat();
  const startDate = getAccountManagerSpreadSheetDateOfInception(ss, mainSheet);
  const endDate = mainSheet.getRange('M2').getValue();

  const targetWeightRange = mainSheet.getRange(`B4:B${4 + assetCount - 1}`);
  const targetWeightsColumn = getTargetWeights(startWeights, finalWeights, startDate, endDate).map(val => [val]);
  targetWeightRange.setValues(targetWeightsColumn);
}

/**
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {SpreadsheetApp.Sheet} mainSheet
 * @param {string[]} tickers
 * @param {number[]} assetValues
 */
function updateAssets(ss, mainSheet, tickers, assetValues)
{
  // reset, if user deletes an asset it will persist unless cleared.
  clearTickers(mainSheet);
  clearAssetValues(mainSheet);
  clearAssetTargetWeights(mainSheet);

  // if nothing to put, don't bother, will get range issues
  if (tickers.length === 0) return;

  const assetCount = tickers.length;
  addTickersToMainSheet(mainSheet, tickers);
  addAssetValuesToMainSheet(mainSheet, assetValues);
  addAssetTargetWeights(ss, mainSheet, assetCount);
}

function updateAccountManager()
{
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const {mainSheet, assetTrackerSheets} = getAccountManagerSheetTypes(ss);
  const tickers = assetTrackerSheets.map((sheet) => sheet.getRange('ticker').getValue());
  const assetValues = assetTrackerSheets.map((sheet) => sheet.getRange('totalValue').getValue());

  updateSpreadSheetName(ss, mainSheet);
  updateAssetTrackerSheetsName(assetTrackerSheets, tickers);
  updateInvestmentTotals(ss, mainSheet, tickers);
  updateAssets(ss, mainSheet, tickers, assetValues);
}

/**
 * The event handler triggered when opening the spreadsheet.
 * @param {Event} e The onOpen event.
 * @see https://developers.google.com/apps-script/guides/triggers#onopene
 */
function onOpen(e)
{
  updateAccountManager(); 
}

/**
 * Note to self:
 * If ever confused about what is going on, read the GIANT
 * comment inside the function onlyBuyRebalance under
 * isEasyBuy. It explains everything!
 * 
 * Also if shit starts to get slow use: https://developers.google.com/apps-script/reference/cache/cache
 */