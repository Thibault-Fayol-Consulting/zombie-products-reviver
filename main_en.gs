/**
 * --------------------------------------------------------------------------
 * Zombie Products Reviver — Google Ads Script
 * --------------------------------------------------------------------------
 * Identifies Shopping products with zero impressions and boosts their bids.
 * Includes CPC cap and null guards for auto-bidding campaigns.
 *
 * Author:  Thibault Fayol — Thibault Fayol Consulting
 * Website: https://thibaultfayol.com
 * License: MIT
 * --------------------------------------------------------------------------
 */

var CONFIG = {
  TEST_MODE: true,
  EMAIL: "you@domain.com",
  CPC_BOOST_PERCENT: 20,
  MAX_CPC_CAP: 5.0,
  DATE_RANGE: "LAST_30_DAYS",
  MIN_CURRENT_CPC: 0.01
};

function main() {
  try {
    Logger.log("=== Zombie Products Reviver ===");
    Logger.log("Mode: " + (CONFIG.TEST_MODE ? "TEST (dry run)" : "LIVE"));
    Logger.log("Boost: +" + CONFIG.CPC_BOOST_PERCENT + "% | Cap: " + CONFIG.MAX_CPC_CAP);

    var query =
      "SELECT segments.product_item_id, segments.product_title, " +
      "ad_group.name, campaign.name, metrics.impressions " +
      "FROM shopping_performance_view " +
      "WHERE segments.date DURING " + CONFIG.DATE_RANGE + " " +
      "AND metrics.impressions = 0";

    var rows = AdsApp.search(query);
    var zombieCount = 0;
    while (rows.hasNext()) {
      rows.next();
      zombieCount++;
    }
    Logger.log("Zombie products from GAQL: " + zombieCount);

    // Apply boosts via product group iterator
    var prodIter = AdsApp.shoppingProductGroups()
      .withCondition("metrics.impressions = 0")
      .forDateRange(CONFIG.DATE_RANGE)
      .get();

    var boostedProducts = [];
    var skippedAutoBid = 0;
    var skippedCapped = 0;
    var skippedLowCpc = 0;

    while (prodIter.hasNext()) {
      var prod = prodIter.next();

      // Null guard for auto-bidding
      var oldCpc = prod.getMaxCpc();
      if (oldCpc === null) {
        Logger.log("Skipping auto-bid: " + (prod.getValue() || "Base"));
        skippedAutoBid++;
        continue;
      }

      if (oldCpc < CONFIG.MIN_CURRENT_CPC) {
        skippedLowCpc++;
        continue;
      }

      // Already at cap
      if (oldCpc >= CONFIG.MAX_CPC_CAP) {
        Logger.log("Already at cap: " + (prod.getValue() || "Base") + " — CPC: " + oldCpc.toFixed(2));
        continue;
      }

      var newCpc = oldCpc * (1 + CONFIG.CPC_BOOST_PERCENT / 100);

      // Enforce cap
      if (newCpc > CONFIG.MAX_CPC_CAP) {
        newCpc = CONFIG.MAX_CPC_CAP;
        skippedCapped++;
      }

      var productName = prod.getValue() || "Base";
      Logger.log("Boost: " + productName + " | " + oldCpc.toFixed(2) + " -> " + newCpc.toFixed(2));

      if (!CONFIG.TEST_MODE) {
        prod.setMaxCpc(newCpc);
      }

      boostedProducts.push({
        name: productName,
        oldCpc: oldCpc,
        newCpc: newCpc
      });
    }

    Logger.log("Products boosted: " + boostedProducts.length);
    Logger.log("Skipped (auto-bid): " + skippedAutoBid);
    Logger.log("Skipped (capped): " + skippedCapped);
    Logger.log("Skipped (low CPC): " + skippedLowCpc);

    if (boostedProducts.length > 0 || skippedAutoBid > 0) {
      sendReport(boostedProducts, skippedAutoBid, skippedCapped, skippedLowCpc);
    }

    Logger.log("=== Done ===");

  } catch (e) {
    Logger.log("ERROR: " + e.message);
    MailApp.sendEmail(CONFIG.EMAIL, "Zombie Reviver — Script Error",
      "Error:\n\n" + e.message + "\n\nStack: " + e.stack);
  }
}

function sendReport(boostedProducts, skippedAutoBid, skippedCapped, skippedLowCpc) {
  var account = AdsApp.currentAccount().getName();
  var subject = "Zombie Reviver: " + boostedProducts.length + " products boosted — " + account;

  var body = "Zombie Products Reviver Report\n";
  body += "Account: " + account + "\n";
  body += "Boost: +" + CONFIG.CPC_BOOST_PERCENT + "% | Cap: " + CONFIG.MAX_CPC_CAP + "\n";
  body += "Mode: " + (CONFIG.TEST_MODE ? "TEST" : "LIVE") + "\n\n";
  body += "Boosted: " + boostedProducts.length + "\n";
  body += "Skipped (auto-bid): " + skippedAutoBid + "\n";
  body += "Skipped (capped): " + skippedCapped + "\n";
  body += "Skipped (low CPC): " + skippedLowCpc + "\n\n";

  body += "Boosted products:\n";
  body += "-------------------------------------------\n";
  var limit = Math.min(boostedProducts.length, 50);
  for (var i = 0; i < limit; i++) {
    var p = boostedProducts[i];
    body += (i + 1) + ". " + p.name + " | " + p.oldCpc.toFixed(2) + " -> " + p.newCpc.toFixed(2) + "\n";
  }

  if (boostedProducts.length > limit) {
    body += "\n... and " + (boostedProducts.length - limit) + " more.\n";
  }

  body += "\nWARNING: Repeated runs cause compounding bid increases. Monitor and pause when done.\n";

  MailApp.sendEmail(CONFIG.EMAIL, subject, body);
  Logger.log("Report sent to " + CONFIG.EMAIL);
}
