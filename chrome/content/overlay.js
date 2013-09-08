/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;


var simplels = {

    langsvc: null,
    windowLocale: null,

    prefs: null,
    strings: null,
    localeStrings: { languageNames: null, regionNames: null, formats: null },

    isToolbarButtonUpdatePending: false,


    handleEvent: function(event) {
        switch (event.type) {
            case "load" :
                this.onLoad();
                break;

            case "aftercustomization" :
                this.onAfterCustomization();
                break;

            case "unload" :
                this.onUnload();
                break;
        }
    },


    onLoad: function() {
        Cu.import("resource://simplels/general.jsm", this);
        Cu.import("resource://simplels/language.jsm", this);

        this.langsvc = Cc["@nohamelin/sls/language-service;1"]
                       .getService().wrappedJSObject;
        this.windowLocale = this.langsvc.currentLocale;

        this.prefs = Services.prefs.getBranch("extensions.simplels.");
        this.strings = document.getElementById("simplels-strings");

        this.localeStrings.languageNames = document.getElementById(
                                                "simplels-language-names");
        this.localeStrings.regionNames = document.getElementById(
                                                "simplels-region-names");
        this.localeStrings.formats = document.getElementById(
                                                "simplels-name-formats");

        this.prefs.QueryInterface(Ci.nsIPrefBranch2);   // COMPAT: Gecko 12-
        this.prefs.addObserver("", this, false);

        Services.obs.addObserver(this, "sls:matching-changed", false);
        Services.obs.addObserver(this, "sls:selected-changed", false);
        Services.obs.addObserver(this, "sls:availables-changed", false);

        // Initialize dinamic attributes of commands and toolbar button
        this.updateManageCommand();
        this.updateRestartCommand();
        this.updateMatchCommand();

        window.setTimeout(function() simplels.tryToUpdateToolbarButton(), 60);

        // Don't miss to update the toolbar button when it's added from the
        // toolbar palette too.
        window.addEventListener("aftercustomization", simplels);
    },


    onUnload: function() {
        this.prefs.removeObserver("", this);

        Services.obs.removeObserver(this, "sls:matching-changed");
        Services.obs.removeObserver(this, "sls:selected-changed");
        Services.obs.removeObserver(this, "sls:availables-changed");
    },


    onAfterCustomization: function() {
        if (this.isToolbarButtonUpdatePending)
            this.tryToUpdateToolbarButton();
    },


    updateManageCommand: function() {
        // TODO: If no language packs are found, opening directly the
        // "Languages" pane of the Add-ons Manager doesn't work. As a weak,
        // temporary workaround, the command will be disabled in this case.
        Cu.import("resource://gre/modules/AddonManager.jsm");

        AddonManager.getAddonsByTypes([ "locale" ], function(addons) {
            let manageCmd = document.getElementById("sls_manageLanguages");

            if (!addons.length)
                manageCmd.setAttribute("disabled", "true");
            else
                // removeAttribute doesn't raise an exception if the attribute
                // isn't found.
                manageCmd.removeAttribute("disabled");
        });
    },


    updateRestartCommand: function() {
        let restartCmd = document.getElementById(
                                  "sls_toggleRestartAfterSwitch");
        let wantRestart = this.prefs.getBoolPref("button.restartAfterSwitch");

        restartCmd.setAttribute("checked", wantRestart);
    },


    updateMatchCommand: function() {
        let matchCmd = document.getElementById("sls_enableMatchingOS");
        let wantMatch = this.langsvc.matchingOS;

        matchCmd.setAttribute("checked", wantMatch);
    },


    tryToUpdateToolbarButton: function() {
        let button = document.getElementById("simplels-button");
        if (button) {
            this.isToolbarButtonUpdatePending = false;

            // The general items of the toolbar button's popup work with
            // broadcasters, so they are always correctly set, and we can
            // to ignore them here.
            this.updateToolbarButtonTooltip();
            this.updateLocalePopupItems();
        }
        else
            this.isToolbarButtonUpdatePending = true;
    },


    updateToolbarButtonTooltip: function() {
        let $ = function(id) document.getElementById("simplels-" + id);

        // The tooltip displays information about the next pieces:
        // 1. The locale selected, expected by the user.
        let selectedLocale = this.langsvc.selectedLocale;
        let isSelectedMatchingOS = this.langsvc.matchingOS;
        let isSelectedAvailable = this.langUtils
                                      .isLocaleAvailable(selectedLocale);
        let informAboutSelected = isSelectedMatchingOS || !isSelectedAvailable;

        $("tooltip-selected").value = this.getLocaleName(selectedLocale);
        $("tooltip-selected-about").hidden = !informAboutSelected;

        let aboutMsg = "";
        if (informAboutSelected) {
            let matchingMsg = this.strings.getString("tooltip.matchingOS");
            let noAvailableMsg = this.strings.getString("tooltip.noAvailable");

            if (isSelectedMatchingOS && !isSelectedAvailable)
                aboutMsg = this.strings.getFormattedString("tooltip.both",
                                                           [ matchingMsg,
                                                             noAvailableMsg ]);
            else if (isSelectedMatchingOS)
                aboutMsg = matchingMsg;
            else  // !isSelectedAvailable
                aboutMsg = noAvailableMsg;
        }
        $("tooltip-selected-about").value = aboutMsg;

        // 2. The locale applied to the current window.
        let currentLocale = this.windowLocale;
        let areLocalesInConflict = currentLocale != selectedLocale;

        $("button-tooltip").setAttribute("conflicting", areLocalesInConflict);
        $("tooltip-current-row").hidden = !areLocalesInConflict;
        $("tooltip-current").value = this.getLocaleName(currentLocale);

        // TODO
        // 3. The locale that will be applied on quit, selected for the next
        // execution.
    },


    updateLocalePopupItems: function() {
        let popup = document.getElementById("simplels-button-popup");

        this.updatePopupLocales(popup);
    },


    updatePopupLocales: function(popup) {
        let itemCallback = function(locale) {
            return function() { simplels.switchTo(locale); }
        };
        let checkedLocale = this.langsvc.userLocale;
        let isCheckedAvailable = this.langUtils
                                     .isLocaleAvailable(checkedLocale);
        let isCheckedIgnored = this.langsvc.matchingOS;

        // Build the set of displayed locales
        let locales = this.langsvc.availableLocales;
        if (!isCheckedAvailable && !isCheckedIgnored) {
            locales = locales.slice();
            locales.push(checkedLocale);
        }
        this.langUtils.sortLocales(locales);

        //
        this.resetPopupLocales(popup);

        locales.forEach(function(locale) {
            let item = document.createElement("menuitem");
            popup.appendChild(item);

            item.className = "simplels-locale";
            item.id = "simplels-locale-" + locale;
            item.setAttribute("type", "radio");
            item.setAttribute("autocheck", "false");
            item.setAttribute("label", this.getLocaleName(locale));
            item.setAttribute("tooltiptext", locale);
            item.addEventListener("command", itemCallback(locale));

            if (locale == this.windowLocale)
                item.setAttribute("current", "true");
            if (locale == checkedLocale) {
                if (!isCheckedIgnored)
                    item.setAttribute("checked", true);
                if (!isCheckedAvailable)
                    item.setAttribute("disabled", true);
            }
        }, this);
    },


    resetPopupLocales: function(popup) {
        let items = popup.childNodes;

        for (let i = items.length - 1; i >= 0; --i) {
            let item = items[i];

            if (item.classList.contains("simplels-locale"))
                popup.removeChild(item);
        }
    },


    observe: function(subject, topic, data) {
        switch (topic) {
            case "sls:matching-changed" :
                this.updateMatchCommand();
                this.tryToUpdateToolbarButton();
                break;

            case "sls:selected-changed" :
                this.tryToUpdateToolbarButton();
                break;

            case "sls:availables-changed" :
                this.updateManageCommand();
                this.tryToUpdateToolbarButton();
                break;

            case "nsPref:changed" :
                switch (data) {
                    case "button.restartAfterSwitch" :
                        this.updateRestartCommand();
                        break;
                }
                break;
        }
    },


    openLanguagesManager: function() {
        switch (this.utils.application) {
            case this.FIREFOX_ID :
                BrowserOpenAddonsMgr("addons://list/locale");
                break;

            case this.THUNDERBIRD_ID :
                openAddonsMgr("addons://list/locale");
                break;
        }
    },


    openGetMoreLanguagesPage: function() {
        Cu.import("resource://simplels/urlFormatter.jsm", this);

        let getURL = this.utils.getComplexCharPref(this.prefs,
                                                   "getMoreLanguagesURL");
        getURL = this.formatURL(getURL);

        switch (this.utils.application) {
            case this.FIREFOX_ID :
                openUILinkIn(getURL, "tab");
                break;

            case this.THUNDERBIRD_ID :
                this.tbUtils.openContentTab(getURL);
                break;
        }
    },


    toggleRestartAfterSwitch: function() {
        let wantedRestart = this.prefs.getBoolPref("button.restartAfterSwitch");

        this.prefs.setBoolPref("button.restartAfterSwitch", !wantedRestart);
    },


    enableMatchingOS: function() {
        // Try to setup the restart *before* the switch for to prevent
        // displaying the confirmation's dialog in a different language.
        this.restartAfterSwitch();

        this.langsvc.matchingOS = true;
    },


    switchTo: function(locale) {
        // Try to setup the restart *before* the switch for to prevent
        // displaying the confirmation's dialog in a different language.
        this.restartAfterSwitch();

        this.langsvc.userLocale = locale;
    },


    restartAfterSwitch: function() {
        let wantRestart = this.prefs.getBoolPref("button.restartAfterSwitch");
        if (wantRestart)
            Application.restart();      // It could be canceled by the user
    },


    getLocaleName: function(locale) {
        return this.langUtils.buildLocaleName(locale, this.localeStrings);
    }
};


window.addEventListener("load", simplels);
window.addEventListener("unload", simplels);
