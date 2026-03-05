/**
 * zombie-products-reviver - Google Ads Script for SMBs
 * Author: Thibault Fayol
 */
var CONFIG = { TEST_MODE: true };
function main(){
  var prodIter = AdsApp.productGroups().withCondition("Impressions = 0").forDateRange("LAST_30_DAYS").get();
  while(prodIter.hasNext()){
    var prod = prodIter.next();
    Logger.log("Zombie product found: " + prod.getValue());
  }
}