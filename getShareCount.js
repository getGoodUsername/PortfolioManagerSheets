/**
 * Calculate how many shares you have, taking into account stock splits.
 * Expect shareDates and stockSplitDates to be sorted in ascending order.
 * In addition expect shareDates.length === shareCounts.length
 * and stockSplitDates.length === splitRatios.length
 * 
 * @param {Date[]} shareTransactionDates
 * @param {number[]} shareCounts
 * @param {Date[]} [stockSplitDates]
 * @param {number[]} [splitRatios]
 * @returns {number}
 * @customfunction
 */
function getShareCount(shareTransactionDates, sharesTransacted, stockSplitDates, splitRatios)
{
    let result = 0;
    let splitPtr = 0;
    for (let i = 0; i < sharesTransacted.length; i += 1)
    {
        /**
         * apply all the stock splits to the previous shares. Works
         * only if both shareTransactionDates and stockSplitDates are sorted in
         * ascending order, which they should be
         * Note that I check for >= since, in practice, stock splits only affect
         * shares that were bought previous to current share Date, so
         * I want to not only apply the split to the previous shares
         * but also avoid applying the stock split to any shares
         * bought on the same day as the split by just getting that
         * stock split out of the queue.
         */
        for (; splitPtr < stockSplitDates.length && shareTransactionDates[i] >= stockSplitDates[splitPtr]; splitPtr += 1)
        {
            result *= splitRatios[splitPtr];
        }
        result += sharesTransacted[i];
    }

    // in case stockSplitDates[-1] > shareDates[-1]
    for (; splitPtr < stockSplitDates.length; splitPtr += 1)
    {
        result *= splitRatios[splitPtr];
    }

    return result;
}





/**
 * Below is a version of getShareCount that
 * does't allow looping, and doesn't allow for
 * mutability or the creation of local variables.
 *
 * This is a proof of concept for a google sheets
 * named function. This should be translatable to a
 * google sheets named function.
 */


function ASSET_TRACKER_ALWAYS_APPLY_SPLIT
(
    splitRatios,
    [transactionPtr, splitPtr, result]
)
{
    // change to <= to google sheets since arrays start at index 1
    if (splitPtr < splitRatios.length)
    {
        return ASSET_TRACKER_ALWAYS_APPLY_SPLIT(
            splitRatios,
            [transactionPtr, splitPtr + 1, result * splitRatios[splitPtr]]
        );
    }

    return [transactionPtr, splitPtr, result];

/**
GOOGLE SHEETS TRANSLATION:

splitRatios                        -> split_ratios
[transactionPtr, splitPtr, result] -> impl_values

= IF(INDEX(impl_values, 2) <= COUNTA(split_ratios),
    ASSET_TRACKER_ALWAYS_APPLY_SPLIT(
        split_ratios,
        {
            INDEX(impl_values, 1);
            INDEX(impl_values, 2) + 1;
            INDEX(impl_values, 3) * INDEX(split_ratios, INDEX(impl_values, 2))
        }
    ),
    impl_values
)

*/
}


function ASSET_TRACKER_APPLY_SPLIT
(
    currShareTransactionDate,
    currShareTransaction,
    stockSplitDates,
    splitRatios,
    [transactionPtr, splitPtr, result]
)
{
    if (
        splitPtr < stockSplitDates.length && // change to <= to google sheets since arrays start at index 1
        currShareTransactionDate >= stockSplitDates[splitPtr]
    )
    {
        return ASSET_TRACKER_APPLY_SPLIT(
            currShareTransactionDate,
            currShareTransaction,
            stockSplitDates,
            splitRatios,
            [transactionPtr, splitPtr + 1, result * splitRatios[splitPtr]]
        )
    }

    // only add current share transacted to result after doing
    // all the splits for the shares before curr share.
    return [transactionPtr, splitPtr, result + currShareTransaction];

/**
GOOGLE SHEETS TRANSLATION:

currShareTransactionDate           -> curr_share_transaction_date
currShareTransaction               -> curr_share_transaction
stockSplitDates                    -> stock_split_dates
splitRatios                        -> split_ratios
[transactionPtr, splitPtr, result] -> impl_values

AS A QUICK NOTE, can not use AND here since won't short circuit
and will continue to evaluate the other expression even if invalid :(

=IF(INDEX(impl_values, 2) <= COUNTA(stock_split_dates),
    IF(curr_share_transaction_date >= INDEX(stock_split_dates, INDEX(impl_values, 2)),
        ASSET_TRACKER_APPLY_SPLIT(
            curr_share_transaction_date,
            curr_share_transaction,
            stock_split_dates,
            split_ratios,
            {
                INDEX(impl_values, 1);
                INDEX(impl_values, 2) + 1;
                INDEX(impl_values, 3) * INDEX(split_ratios, INDEX(impl_values, 2))
            }
        ),
        {
            INDEX(impl_values, 1);
            INDEX(impl_values, 2);
            INDEX(impl_values, 3) + curr_share_transaction
        }
    ),
    {
        INDEX(impl_values, 1);
        INDEX(impl_values, 2);
        INDEX(impl_values, 3) + curr_share_transaction
    }
)

*/
}

function MAIN_LOOP_ASSET_TRACKER_GET_SHARE_COUNT
(
    shareTransactionDates,
    sharesTransacted,
    stockSplitDates,
    splitRatios,
    [transactionPtr, splitPtr, result]
)
{
    // change to <= to google sheets since arrays start at index 1
    if (transactionPtr < shareTransactionDates.length)
    {
        return MAIN_LOOP_ASSET_TRACKER_GET_SHARE_COUNT(
            shareTransactionDates,
            sharesTransacted,
            stockSplitDates,
            splitRatios,
            ASSET_TRACKER_APPLY_SPLIT(
                shareTransactionDates[transactionPtr],
                sharesTransacted[transactionPtr],
                stockSplitDates,
                splitRatios,
                [transactionPtr + 1, splitPtr, result]
            )
        );
    }

    return [transactionPtr, splitPtr, result];

/**
GOOGLE SHEETS TRANSLATION:

shareTransactionDates              -> share_transaction_dates
sharesTransacted                   -> shares_transacted
stockSplitDates                    -> stock_split_dates
splitRatios                        -> split_ratios
[transactionPtr, splitPtr, result] -> impl_values

=IF(INDEX(impl_values, 1) <= COUNTA(share_transaction_dates),
    MAIN_LOOP_ASSET_TRACKER_GET_SHARE_COUNT(
        share_transaction_dates,
        shares_transacted,
        stock_split_dates,
        split_ratios,
        ASSET_TRACKER_APPLY_SPLIT(
            INDEX(share_transaction_dates, INDEX(impl_values, 1)),
            INDEX(shares_transacted, INDEX(impl_values, 1)),
            stock_split_dates,
            split_ratios,
            {
                INDEX(impl_values, 1) + 1;
                INDEX(impl_values, 2);
                INDEX(impl_values, 3)
            }
        )
    ),
    impl_values
)

*/
}

function ASSET_TRACKER_GET_SHARE_COUNT
(
    shareTransactionDates,
    sharesTransacted,
    stockSplitDates,
    splitRatios,
)
{
    if (stockSplitDates.length === 0) return sharesTransacted.reduce((result, val) => result + val, 0);

    return ASSET_TRACKER_ALWAYS_APPLY_SPLIT(
        splitRatios,
        MAIN_LOOP_ASSET_TRACKER_GET_SHARE_COUNT(
            shareTransactionDates,
            sharesTransacted,
            stockSplitDates,
            splitRatios,
            [
                0, // change to 1 in google sheets, since arrays are indexed starting at 1
                0, // change to 1 in google sheets, since arrays are indexed starting at 1
                0
            ]
        )
    )[2]; // change "[2]" to "[3]", array index start at 1 with google sheets

/**
GOOGLE SHEETS TRANSLATION:

shareTransactionDates              -> share_transaction_dates
sharesTransacted                   -> shares_transacted
stockSplitDates                    -> stock_split_dates
splitRatios                        -> split_ratios


=IF(COUNTA(stock_split_dates) = 0,
    SUM(shares_transacted),
    INDEX(
        ASSET_TRACKER_ALWAYS_APPLY_SPLIT(
            split_ratios,
            MAIN_LOOP_ASSET_TRACKER_GET_SHARE_COUNT(
                share_transaction_dates,
                shares_transacted,
                stock_split_dates,
                split_ratios,
                {1; 1; 0}
            )
        ),
        3
    )
)
*/
}


const testInput =
[
    ['12/12/2000', '01/01/2002'].map(val => new Date(val)),
    [10,            -5,         ],
    ['12/12/2000', '12/13/2000', '12/14/2000', '12/15/2005'].map(val => new Date(val)),
    [2,             3,            2,            4,         ]
]

// const testInput =
// [
//     ['12/12/2000', '01/01/2002'].map(val => new Date(val)),
//     [10,            5,         ],
//     ['12/12/2000', '12/13/2000'].map(val => new Date(val)),
//     [2,             3,         ]
// ]




getShareCount(...testInput) // ?
ASSET_TRACKER_GET_SHARE_COUNT(...testInput) // ?
