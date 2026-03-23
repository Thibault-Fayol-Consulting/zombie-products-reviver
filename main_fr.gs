/**
 * --------------------------------------------------------------------------
 * Zombie Products Reviver — Script Google Ads
 * --------------------------------------------------------------------------
 * Identifie les produits Shopping sans impressions et augmente leurs encheres.
 * Inclut un plafond CPC et des protections pour encheres automatiques.
 *
 * Auteur:  Thibault Fayol — Thibault Fayol Consulting
 * Site:    https://thibaultfayol.com
 * Licence: MIT
 * --------------------------------------------------------------------------
 */

var CONFIG = {
  TEST_MODE: true,
  EMAIL: "vous@domaine.com",
  CPC_BOOST_PERCENT: 20,
  MAX_CPC_CAP: 5.0,
  DATE_RANGE: "LAST_30_DAYS",
  MIN_CURRENT_CPC: 0.01
};

function main() {
  try {
    Logger.log("=== Reanimateur Produits Zombies ===");
    Logger.log("Mode : " + (CONFIG.TEST_MODE ? "TEST (simulation)" : "PRODUCTION"));
    Logger.log("Boost : +" + CONFIG.CPC_BOOST_PERCENT + "% | Plafond : " + CONFIG.MAX_CPC_CAP);

    var query =
      "SELECT segments.product_item_id, segments.product_title, " +
      "ad_group.name, campaign.name, metrics.impressions " +
      "FROM shopping_performance_view " +
      "WHERE segments.date DURING " + CONFIG.DATE_RANGE + " " +
      "AND metrics.impressions = 0";

    var rows = AdsApp.search(query);
    var nbZombies = 0;
    while (rows.hasNext()) {
      rows.next();
      nbZombies++;
    }
    Logger.log("Produits zombies GAQL : " + nbZombies);

    var prodIter = AdsApp.shoppingProductGroups()
      .withCondition("metrics.impressions = 0")
      .forDateRange(CONFIG.DATE_RANGE)
      .get();

    var produitsBoosted = [];
    var ignoresAutoBid = 0;
    var ignoresPlafond = 0;
    var ignoresCpcBas = 0;

    while (prodIter.hasNext()) {
      var prod = prodIter.next();

      var oldCpc = prod.getMaxCpc();
      if (oldCpc === null) {
        Logger.log("Ignore (encheres auto) : " + (prod.getValue() || "Base"));
        ignoresAutoBid++;
        continue;
      }

      if (oldCpc < CONFIG.MIN_CURRENT_CPC) {
        ignoresCpcBas++;
        continue;
      }

      if (oldCpc >= CONFIG.MAX_CPC_CAP) {
        Logger.log("Deja au plafond : " + (prod.getValue() || "Base") + " — CPC : " + oldCpc.toFixed(2));
        continue;
      }

      var newCpc = oldCpc * (1 + CONFIG.CPC_BOOST_PERCENT / 100);

      if (newCpc > CONFIG.MAX_CPC_CAP) {
        newCpc = CONFIG.MAX_CPC_CAP;
        ignoresPlafond++;
      }

      var nomProduit = prod.getValue() || "Base";
      Logger.log("Boost : " + nomProduit + " | " + oldCpc.toFixed(2) + " -> " + newCpc.toFixed(2));

      if (!CONFIG.TEST_MODE) {
        prod.setMaxCpc(newCpc);
      }

      produitsBoosted.push({
        nom: nomProduit,
        ancienCpc: oldCpc,
        nouveauCpc: newCpc
      });
    }

    Logger.log("Produits boostes : " + produitsBoosted.length);
    Logger.log("Ignores (encheres auto) : " + ignoresAutoBid);
    Logger.log("Ignores (plafond) : " + ignoresPlafond);
    Logger.log("Ignores (CPC bas) : " + ignoresCpcBas);

    if (produitsBoosted.length > 0 || ignoresAutoBid > 0) {
      envoyerRapport(produitsBoosted, ignoresAutoBid, ignoresPlafond, ignoresCpcBas);
    }

    Logger.log("=== Termine ===");

  } catch (e) {
    Logger.log("ERREUR : " + e.message);
    MailApp.sendEmail(CONFIG.EMAIL, "Reanimateur Zombies — Erreur Script",
      "Erreur :\n\n" + e.message + "\n\nStack : " + e.stack);
  }
}

function envoyerRapport(produitsBoosted, ignoresAutoBid, ignoresPlafond, ignoresCpcBas) {
  var compte = AdsApp.currentAccount().getName();
  var sujet = "Reanimateur Zombies : " + produitsBoosted.length + " boostes — " + compte;

  var corps = "Rapport Reanimateur Produits Zombies\n";
  corps += "Compte : " + compte + "\n";
  corps += "Boost : +" + CONFIG.CPC_BOOST_PERCENT + "% | Plafond : " + CONFIG.MAX_CPC_CAP + "\n";
  corps += "Mode : " + (CONFIG.TEST_MODE ? "TEST" : "PRODUCTION") + "\n\n";
  corps += "Boostes : " + produitsBoosted.length + "\n";
  corps += "Ignores (encheres auto) : " + ignoresAutoBid + "\n";
  corps += "Ignores (plafond) : " + ignoresPlafond + "\n";
  corps += "Ignores (CPC bas) : " + ignoresCpcBas + "\n\n";

  corps += "Produits boostes :\n";
  corps += "-------------------------------------------\n";
  var limit = Math.min(produitsBoosted.length, 50);
  for (var i = 0; i < limit; i++) {
    var p = produitsBoosted[i];
    corps += (i + 1) + ". " + p.nom + " | " + p.ancienCpc.toFixed(2) + " -> " + p.nouveauCpc.toFixed(2) + "\n";
  }

  if (produitsBoosted.length > limit) {
    corps += "\n... et " + (produitsBoosted.length - limit) + " autres.\n";
  }

  corps += "\nATTENTION : Des executions repetees causent une augmentation cumulative. Surveillez.\n";

  MailApp.sendEmail(CONFIG.EMAIL, sujet, corps);
  Logger.log("Rapport envoye a " + CONFIG.EMAIL);
}
