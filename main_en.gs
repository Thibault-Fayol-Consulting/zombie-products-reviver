/**
 * --------------------------------------------------------------------------
 * zombie-products-reviver - Google Ads Script for SMBs
 * --------------------------------------------------------------------------
 * Author: Thibault Fayol - Consultant SEA PME
 * Website: https://thibaultfayol.com
 * License: MIT
 * --------------------------------------------------------------------------
 */
var CONFIG = { TEST_MODE: true, BID_BOOST_PERCENT: 20 };
function main() {
    Logger.log("Reviving Zombie Products...");
    var prodIter = AdsApp.productGroups().withCondition("Impressions = 0").withCondition("MaxCpc > 0").forDateRange("LAST_30_DAYS").get();
    var count = 0;
    while(prodIter.hasNext()){
        var prod = prodIter.next();
        var oldCpc = prod.getMaxCpc();
        var newCpc = oldCpc * (1 + (CONFIG.BID_BOOST_PERCENT/100));
        Logger.log("Boosting Zombie Product: " + (prod.getValue()||"Base") + " from " + oldCpc + " to " + newCpc.toFixed(2));
        if(!CONFIG.TEST_MODE) prod.setMaxCpc(newCpc);
        count++;
    }
    Logger.log("Revived " + count + " products.");
}
