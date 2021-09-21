import { loadAliases, loadGlobalAliases, Aliases, GlobalAliases } from "./Alias";
import { Companies, loadCompanies } from "./Company/Companies";
import { CONSTANTS } from "./Constants";
import { Engine } from "./engine";
import { Factions, loadFactions } from "./Faction/Factions";
import { loadFconf } from "./Fconf/Fconf";
import { FconfSettings } from "./Fconf/FconfSettings";
import { loadAllGangs, AllGangs } from "./Gang/AllGangs";
import { loadMessages, initMessages, Messages } from "./Message/MessageHelpers";
import { Player, loadPlayer } from "./Player";
import { AllServers, loadAllServers } from "./Server/AllServers";
import { Settings } from "./Settings/Settings";
import { loadSpecialServerIps, SpecialServerIps } from "./Server/SpecialServerIps";
import { SourceFileFlags } from "./SourceFile/SourceFileFlags";
import { loadStockMarket, StockMarket } from "./StockMarket/StockMarket";

import { createStatusText } from "./ui/createStatusText";

import { setTimeoutRef } from "./utils/SetTimeoutRef";
import * as ExportBonus from "./ExportBonus";

import { dialogBoxCreate } from "../utils/DialogBox";
import { clearEventListeners } from "../utils/uiHelpers/clearEventListeners";
import { Reviver, Generic_toJSON, Generic_fromJSON } from "../utils/JSONReviver";

import Decimal from "decimal.js";

/* SaveObject.js
 *  Defines the object used to save/load games
 */
let saveObject = new BitburnerSaveObject();

function BitburnerSaveObject() {
  this.PlayerSave = "";
  this.AllServersSave = "";
  this.CompaniesSave = "";
  this.FactionsSave = "";
  this.SpecialServerIpsSave = "";
  this.AliasesSave = "";
  this.GlobalAliasesSave = "";
  this.MessagesSave = "";
  this.StockMarketSave = "";
  this.SettingsSave = "";
  this.FconfSettingsSave = "";
  this.VersionSave = "";
  this.AllGangsSave = "";
  this.LastExportBonus = "";
}

BitburnerSaveObject.prototype.getSaveString = function () {
  this.PlayerSave = JSON.stringify(Player);

  // Delete all logs from all running scripts
  var TempAllServers = JSON.parse(JSON.stringify(AllServers), Reviver);
  for (var ip in TempAllServers) {
    var server = TempAllServers[ip];
    if (server == null) {
      continue;
    }
    for (var i = 0; i < server.runningScripts.length; ++i) {
      var runningScriptObj = server.runningScripts[i];
      runningScriptObj.logs.length = 0;
      runningScriptObj.logs = [];
    }
  }

  this.AllServersSave = JSON.stringify(TempAllServers);
  this.CompaniesSave = JSON.stringify(Companies);
  this.FactionsSave = JSON.stringify(Factions);
  this.SpecialServerIpsSave = JSON.stringify(SpecialServerIps);
  this.AliasesSave = JSON.stringify(Aliases);
  this.GlobalAliasesSave = JSON.stringify(GlobalAliases);
  this.MessagesSave = JSON.stringify(Messages);
  this.StockMarketSave = JSON.stringify(StockMarket);
  this.SettingsSave = JSON.stringify(Settings);
  this.FconfSettingsSave = JSON.stringify(FconfSettings);
  this.VersionSave = JSON.stringify(CONSTANTS.Version);
  this.LastExportBonus = JSON.stringify(ExportBonus.LastExportBonus);
  if (Player.inGang()) {
    this.AllGangsSave = JSON.stringify(AllGangs);
  }
  var saveString = btoa(unescape(encodeURIComponent(JSON.stringify(this))));

  return saveString;
};

BitburnerSaveObject.prototype.saveGame = function (db) {
  var saveString = this.getSaveString();

  // We'll save to both localstorage and indexedDb
  var objectStore = db.transaction(["savestring"], "readwrite").objectStore("savestring");
  var request = objectStore.put(saveString, "save");

  request.onerror = function (e) {
    console.error("Error saving game to IndexedDB: " + e);
  };

  try {
    window.localStorage.setItem("bitburnerSave", saveString);
  } catch (e) {
    if (e.code == 22) {
      createStatusText("Save failed for localStorage! Check console(F12)");
      console.error(
        "Failed to save game to localStorage because the size of the save file " +
          "is too large. However, the game will still be saved to IndexedDb if your browser " +
          "supports it. If you would like to save to localStorage as well, then " +
          "consider killing several of your scripts to " +
          "fix this, or increasing the size of your browsers localStorage",
      );
    }
  }

  createStatusText("Game saved!");
};

// Makes necessary changes to the loaded/imported data to ensure
// the game stills works with new versions
function evaluateVersionCompatibility(ver) {
  // This version refactored the Company/job-related code
  if (ver <= "0.41.2") {
    // Player's company position is now a string
    if (Player.companyPosition != null && typeof Player.companyPosition !== "string") {
      Player.companyPosition = Player.companyPosition.data.positionName;
      if (Player.companyPosition == null) {
        Player.companyPosition = "";
      }
    }

    // The "companyName" property of all Companies is renamed to "name"
    for (var companyName in Companies) {
      const company = Companies[companyName];
      if ((company.name == null || company.name === 0 || company.name === "") && company.companyName != null) {
        company.name = company.companyName;
      }

      if (company.companyPositions instanceof Array) {
        const pos = {};

        for (let i = 0; i < company.companyPositions.length; ++i) {
          pos[company.companyPositions[i]] = true;
        }
        company.companyPositions = pos;
      }
    }
  }

  // This version allowed players to hold multiple jobs
  if (ver < "0.43.0") {
    if (Player.companyName !== "" && Player.companyPosition != null && Player.companyPosition !== "") {
      Player.jobs[Player.companyName] = Player.companyPosition;
    }

    delete Player.companyPosition;
  }
}

function loadGame(saveString) {
  if (saveString === "" || saveString == null || saveString === undefined) {
    if (!window.localStorage.getItem("bitburnerSave")) {
      return false;
    }
    saveString = decodeURIComponent(escape(atob(window.localStorage.getItem("bitburnerSave"))));
  } else {
    saveString = decodeURIComponent(escape(atob(saveString)));
  }

  var saveObj = JSON.parse(saveString, Reviver);

  loadPlayer(saveObj.PlayerSave);
  loadAllServers(saveObj.AllServersSave);
  loadCompanies(saveObj.CompaniesSave);
  loadFactions(saveObj.FactionsSave);
  loadSpecialServerIps(saveObj.SpecialServerIpsSave);

  if (saveObj.hasOwnProperty("AliasesSave")) {
    try {
      loadAliases(saveObj.AliasesSave);
    } catch (e) {
      console.warn(`Could not load Aliases from save`);
      loadAliases("");
    }
  } else {
    console.warn(`Save file did not contain an Aliases property`);
    loadAliases("");
  }
  if (saveObj.hasOwnProperty("GlobalAliasesSave")) {
    try {
      loadGlobalAliases(saveObj.GlobalAliasesSave);
    } catch (e) {
      console.warn(`Could not load GlobalAliases from save`);
      loadGlobalAliases("");
    }
  } else {
    console.warn(`Save file did not contain a GlobalAliases property`);
    loadGlobalAliases("");
  }
  if (saveObj.hasOwnProperty("MessagesSave")) {
    try {
      loadMessages(saveObj.MessagesSave);
    } catch (e) {
      console.warn(`Could not load Messages from save`);
      initMessages();
    }
  } else {
    console.warn(`Save file did not contain a Messages property`);
    initMessages();
  }
  if (saveObj.hasOwnProperty("StockMarketSave")) {
    try {
      loadStockMarket(saveObj.StockMarketSave);
    } catch (e) {
      loadStockMarket("");
    }
  } else {
    loadStockMarket("");
  }
  if (saveObj.hasOwnProperty("SettingsSave")) {
    try {
      Settings.load(saveObj.SettingsSave);
    } catch (e) {
      console.error("ERROR: Failed to parse Settings. Re-initing default values");
      Settings.init();
    }
  } else {
    Settings.init();
  }
  // if (saveObj.hasOwnProperty("FconfSettingsSave")) {
  //   try {
  //     loadFconf(saveObj.FconfSettingsSave);
  //   } catch (e) {
  //     console.error("ERROR: Failed to parse .fconf Settings.");
  //   }
  // }
  if (saveObj.hasOwnProperty("LastExportBonus")) {
    try {
      ExportBonus.setLastExportBonus(JSON.parse(saveObj.LastExportBonus));
    } catch (err) {
      ExportBonus.setLastExportBonus(new Date().getTime());
      console.error("ERROR: Failed to parse last export bonus Settings " + err);
    }
  }
  if (saveObj.hasOwnProperty("VersionSave")) {
    try {
      var ver = JSON.parse(saveObj.VersionSave, Reviver);
      evaluateVersionCompatibility(ver);

      if (window.location.href.toLowerCase().includes("bitburner-beta")) {
        // Beta branch, always show changes
        createBetaUpdateText();
      } else if (ver != CONSTANTS.Version) {
        createNewUpdateText();
      }
    } catch (e) {
      createNewUpdateText();
    }
  } else {
    createNewUpdateText();
  }
  if (Player.inGang() && saveObj.hasOwnProperty("AllGangsSave")) {
    try {
      loadAllGangs(saveObj.AllGangsSave);
    } catch (e) {
      console.error("ERROR: Failed to parse AllGangsSave: " + e);
    }
  }

  return true;
}

function loadImportedGame(saveObj, saveString) {
  var tempSaveObj = null;
  var tempPlayer = null;

  // Check to see if the imported save file can be parsed. If any
  // errors are caught it will fail
  try {
    var decodedSaveString = decodeURIComponent(escape(atob(saveString)));
    tempSaveObj = JSON.parse(decodedSaveString, Reviver);

    tempPlayer = JSON.parse(tempSaveObj.PlayerSave, Reviver);

    // Parse Decimal.js objects
    tempPlayer.money = new Decimal(tempPlayer.money);

    JSON.parse(tempSaveObj.AllServersSave, Reviver);
    JSON.parse(tempSaveObj.CompaniesSave, Reviver);
    JSON.parse(tempSaveObj.FactionsSave, Reviver);
    JSON.parse(tempSaveObj.SpecialServerIpsSave, Reviver);
    if (tempSaveObj.hasOwnProperty("AliasesSave")) {
      try {
        JSON.parse(tempSaveObj.AliasesSave, Reviver);
      } catch (e) {
        console.error(`Parsing Aliases save failed: ${e}`);
      }
    }
    if (tempSaveObj.hasOwnProperty("GlobalAliases")) {
      try {
        JSON.parse(tempSaveObj.AliasesSave, Reviver);
      } catch (e) {
        console.error(`Parsing Global Aliases save failed: ${e}`);
      }
    }
    if (tempSaveObj.hasOwnProperty("MessagesSave")) {
      try {
        JSON.parse(tempSaveObj.MessagesSave, Reviver);
      } catch (e) {
        console.error(`Parsing Messages save failed: ${e}`);
        initMessages();
      }
    } else {
      initMessages();
    }
    if (saveObj.hasOwnProperty("StockMarketSave")) {
      try {
        JSON.parse(tempSaveObj.StockMarketSave, Reviver);
      } catch (e) {
        console.error(`Parsing StockMarket save failed: ${e}`);
      }
    }
    if (saveObj.hasOwnProperty("LastExportBonus")) {
      try {
        if (saveObj.LastExportBonus) ExportBonus.setLastExportBonus(JSON.parse(saveObj.LastExportBonus));
      } catch (err) {
        ExportBonus.setLastExportBonus(new Date().getTime());
        console.error("ERROR: Failed to parse last export bonus Settings " + err);
      }
    }
    if (tempSaveObj.hasOwnProperty("VersionSave")) {
      try {
        var ver = JSON.parse(tempSaveObj.VersionSave, Reviver);
        evaluateVersionCompatibility(ver);
      } catch (e) {
        console.error("Parsing Version save failed: " + e);
      }
    }
    if (tempPlayer.inGang() && tempSaveObj.hasOwnProperty("AllGangsSave")) {
      try {
        loadAllGangs(tempSaveObj.AllGangsSave);
      } catch (e) {
        console.error(`Failed to parse AllGangsSave: {e}`);
        throw e;
      }
    }
  } catch (e) {
    dialogBoxCreate("Error importing game: " + e.toString());
    return false;
  }

  // Since the save file is valid, load everything for real
  saveString = decodeURIComponent(escape(atob(saveString)));
  saveObj = JSON.parse(saveString, Reviver);

  loadPlayer(saveObj.PlayerSave);
  loadAllServers(saveObj.AllServersSave);
  loadCompanies(saveObj.CompaniesSave);
  loadFactions(saveObj.FactionsSave);
  loadSpecialServerIps(saveObj.SpecialServerIpsSave);

  if (saveObj.hasOwnProperty("AliasesSave")) {
    try {
      loadAliases(saveObj.AliasesSave);
    } catch (e) {
      loadAliases("");
    }
  } else {
    loadAliases("");
  }
  if (saveObj.hasOwnProperty("GlobalAliasesSave")) {
    try {
      loadGlobalAliases(saveObj.GlobalAliasesSave);
    } catch (e) {
      loadGlobalAliases("");
    }
  } else {
    loadGlobalAliases("");
  }
  if (saveObj.hasOwnProperty("MessagesSave")) {
    try {
      loadMessages(saveObj.MessagesSave);
    } catch (e) {
      initMessages();
    }
  } else {
    initMessages();
  }
  if (saveObj.hasOwnProperty("StockMarketSave")) {
    try {
      loadStockMarket(saveObj.StockMarketSave);
    } catch (e) {
      loadStockMarket("");
    }
  } else {
    loadStockMarket("");
  }
  if (saveObj.hasOwnProperty("SettingsSave")) {
    try {
      Settings.load(saveObj.SettingsSave);
    } catch (e) {
      Settings.init();
    }
  } else {
    Settings.init();
  }
  // if (saveObj.hasOwnProperty("FconfSettingsSave")) {
  //   try {
  //     loadFconf(saveObj.FconfSettingsSave);
  //   } catch (e) {
  //     console.error("ERROR: Failed to load .fconf settings when importing");
  //   }
  // }
  if (saveObj.hasOwnProperty("VersionSave")) {
    try {
      var ver = JSON.parse(saveObj.VersionSave, Reviver);
      evaluateVersionCompatibility(ver);

      if (ver != CONSTANTS.Version) {
        createNewUpdateText();
      }
    } catch (e) {
      createNewUpdateText();
    }
  } else {
    createNewUpdateText();
  }
  if (Player.inGang() && saveObj.hasOwnProperty("AllGangsSave")) {
    try {
      loadAllGangs(saveObj.AllGangsSave);
    } catch (e) {
      console.error("ERROR: Failed to parse AllGangsSave: " + e);
    }
  }
  saveObject.saveGame(Engine.indexedDb);
  setTimeout(() => location.reload(), 1000);
  return true;
}

BitburnerSaveObject.prototype.exportGame = function () {
  const saveString = this.getSaveString();

  // Save file name is based on current timestamp and BitNode
  const epochTime = Math.round(Date.now() / 1000);
  const bn = Player.bitNodeN;
  const filename = `bitburnerSave_BN${bn}x${SourceFileFlags[bn]}_${epochTime}.json`;
  var file = new Blob([saveString], { type: "text/plain" });
  if (window.navigator.msSaveOrOpenBlob) {
    // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  } else {
    // Others
    var a = document.createElement("a"),
      url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeoutRef(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
};

BitburnerSaveObject.prototype.importGame = function () {
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    var fileSelector = clearEventListeners("import-game-file-selector");
    fileSelector.addEventListener("change", openImportFileHandler, false);
    $("#import-game-file-selector").click();
  } else {
    dialogBoxCreate("ERR: Your browser does not support HTML5 File API. Cannot import.");
  }
};

BitburnerSaveObject.prototype.deleteGame = function (db) {
  // Delete from local storage
  if (window.localStorage.getItem("bitburnerSave")) {
    window.localStorage.removeItem("bitburnerSave");
  }

  // Delete from indexedDB
  var request = db.transaction(["savestring"], "readwrite").objectStore("savestring").delete("save");
  request.onsuccess = function () {};
  request.onerror = function (e) {
    console.error(`Failed to delete save from indexedDb: ${e}`);
  };
  createStatusText("Game deleted!");
};

function createNewUpdateText() {
  dialogBoxCreate(
    "New update!<br>" +
      "Please report any bugs/issues through the github repository " +
      "or the Bitburner subreddit (reddit.com/r/bitburner).<br><br>" +
      CONSTANTS.LatestUpdate,
  );
}

function createBetaUpdateText() {
  dialogBoxCreate(
    "You are playing on the beta environment! This branch of the game " +
      "features the latest developments in the game. This version may be unstable.<br>" +
      "Please report any bugs/issues through the github repository (https://github.com/danielyxie/bitburner/issues) " +
      "or the Bitburner subreddit (reddit.com/r/bitburner).<br><br>" +
      CONSTANTS.LatestUpdate,
  );
}

BitburnerSaveObject.prototype.toJSON = function () {
  return Generic_toJSON("BitburnerSaveObject", this);
};

BitburnerSaveObject.fromJSON = function (value) {
  return Generic_fromJSON(BitburnerSaveObject, value.data);
};

Reviver.constructors.BitburnerSaveObject = BitburnerSaveObject;

function openImportFileHandler(evt) {
  var file = evt.target.files[0];
  if (!file) {
    dialogBoxCreate("Invalid file selected");
    return;
  }

  var reader = new FileReader();
  reader.onload = function (e) {
    var contents = e.target.result;
    loadImportedGame(saveObject, contents);
  };
  reader.readAsText(file);
}

export { saveObject, loadGame, openImportFileHandler };
