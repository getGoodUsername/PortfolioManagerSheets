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
    /**
     * Date(
     *  year: number,
     *  monthIndex: number,
     *  date?: number | undefined,
     *  hours?: number | undefined,
     *  minutes?: number | undefined,
     *  seconds?: number | undefined,
     *  ms?: number | undefined)
     */
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

getTargetWeights(
[10, 49, 18, 23,  0],
[ 4, 44, 22, 10, 22],
new Date('4/02/2023'),
new Date('4/03/2023')
).map(val => val.toPrecision(6)); // ?