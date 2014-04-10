/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

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
                window.removeEventListener("load", simplels);
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
        this.strings = this.getStringBundle("simplels-strings");
        this.localeStrings.languageNames = this.getStringBundle(
                                                "simplels-language-names");
        this.localeStrings.regionNames = this.getStringBundle(
                                                "simplels-region-names");
        this.localeStrings.formats = this.getStringBundle(
                                                "simplels-name-formats");

        this.prefs.QueryInterface(Ci.nsIPrefBranch2);   // COMPAT: Gecko 12-
        this.prefs.addObserver("", this, false);

        Services.obs.addObserver(this, "sls:selected-changed", false);
        Services.obs.addObserver(this, "sls:availables-changed", false);

        // Initialize dinamic attributes of commands and toolbar button
        this.updateManageCommand();
        this.updateRestartCommand();
        this.updateMatchCommand();
        this.updateDescriptionsBroadcaster();

        window.setTimeout(function() simplels.tryToUpdateToolbarButton(), 60);

        // Don't miss to update the toolbar button when it's added from the
        // toolbar palette.
        window.addEventListener("aftercustomization", simplels);
    },


    onUnload: function() {
        this.prefs.removeObserver("", this);

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
        let disableMatch = this.langsvc.isMatchingOSLocked;

        matchCmd.setAttribute("checked", wantMatch);
        if (disableMatch)
            matchCmd.setAttribute("disabled", "true");
        else
            // removeAttribute doesn't raise an exception if the attribute
            // isn't found.
            matchCmd.removeAttribute("disabled");
    },


    updateDescriptionsBroadcaster: function() {
        let descBcstr = document.getElementById("sls_showLocaleDescriptions");
        let wantDescriptions = this.prefs.getBoolPref(
                                         "button.showDescriptions");

        descBcstr.setAttribute("descriptions", wantDescriptions);
    },


    tryToUpdateToolbarButton: function() {
        let button = document.getElementById("simplels-button");

        // Workaround for
        //   https://bugzilla.mozilla.org/show_bug.cgi?id=941903
        if (!button && "CustomizableUI" in window) {
            let widgetGroup = CustomizableUI.getWidget("simplels-button");

            // areaType is null if the item is in the palette
            if (widgetGroup.areaType)
                button = widgetGroup.forWindow(window).node;
        }

        if (button) {
            this.isToolbarButtonUpdatePending = false;

            // The general items of the toolbar button's popup work with
            // broadcasters, so they are always correctly set, and we can
            // to ignore them here.
            this.updateToolbarButtonTooltip();
            this.updateLocalePopupItems(button.firstChild);
        }
        else
            this.isToolbarButtonUpdatePending = true;
    },


    updateToolbarButtonTooltip: function() {
        let $ = function(id) document.getElementById("simplels-tooltip-" + id);

        // The tooltip displays information about the next pieces:
        // 1. The locale selected, expected by the user.
        let selectedLocale = this.langsvc.selectedLocale;
        let isSelectedMatchingOS = this.langsvc.matchingOS;
        let isSelectedAvailable = this.langUtils
                                      .isLocaleAvailable(selectedLocale);
        let informAboutSelected = isSelectedMatchingOS || !isSelectedAvailable;

        $("selected").value = this.getLocaleName(selectedLocale);
        $("selected-about").hidden = !informAboutSelected;

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
        $("selected-about").value = aboutMsg;

        // 2. The locale applied to the current window.
        let currentLocale = this.windowLocale;
        let areLocalesInConflict = currentLocale != selectedLocale;

        $("current-row").hidden = !areLocalesInConflict;
        $("current").value = this.getLocaleName(currentLocale);

        document.getElementById("simplels-button-tooltip")
                .setAttribute("conflicting", areLocalesInConflict);
    },


    updateLocalePopupItems: function(popup) {
        this.resetPopupLocales(popup);
        this.populatePopupLocales(popup);
    },


    resetPopupLocales: function(popup) {
        let items = popup.childNodes;

        for (let i = items.length - 1; i >= 0; --i) {
            let item = items[i];

            if (item.classList.contains("simplels-locale"))
                popup.removeChild(item);
        }
    },


    populatePopupLocales: function(popup) {
        let checkedLocale = this.langsvc.userLocale;
        let isCheckedAvailable = this.langUtils
                                     .isLocaleAvailable(checkedLocale);
        let isCheckedIgnored = this.langsvc.matchingOS;
        let isCheckedLocked = this.langsvc.isUserLocaleLocked;
        let isCurrentAvailable = this.langUtils
                                     .isLocaleAvailable(this.windowLocale);

        let locales = this.getWindowRelevantLocales();
        this.langUtils.sortLocales(locales);

        let popupFragment = document.createDocumentFragment();
        locales.forEach(function(locale) {
            let item = document.createElement("menuitem");

            item.className = "simplels-locale";
            item.id = "simplels-locale-" + locale;
            item.setAttribute("type", "radio");
            item.setAttribute("autocheck", "false");
            item.setAttribute("label", this.getLocaleName(locale));
            item.setAttribute("description", locale);
            item.setAttribute("tooltiptext", locale);
            item.addEventListener("command", this._switchItemCallback(locale));

            if (locale == this.windowLocale) {
                item.setAttribute("current", "true");
                if (!isCurrentAvailable)
                    item.setAttribute("disabled", "true");
            }
            if (locale == checkedLocale) {
                if (!isCheckedIgnored)
                    item.setAttribute("checked", "true");
                if (!isCheckedAvailable) {
                    item.setAttribute("disabled", "true");

                    if (isCheckedIgnored && locale != this.windowLocale)
                        item.setAttribute("hidden", "true");  // Not relevant
                }
            }
            if (isCheckedLocked)
                item.setAttribute("disabled", "true");

            popupFragment.appendChild(item);
        }, this);

        popup.appendChild(popupFragment);
    },

    _switchItemCallback: function(locale) {
        return function() simplels.switchTo(locale);
    },


    observe: function(subject, topic, data) {
        switch (topic) {
            case "sls:selected-changed" :
                this.updateMatchCommand();
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

                    case "button.showDescriptions" :
                        this.updateDescriptionsBroadcaster();
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
        Cu.import("resource://simplels/langpacks.jsm", this);
        let getURL = this.getMoreLanguagesURL();

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
        this.langsvc.matchingOS = true;

        this.restartAfterSwitch();
    },


    switchTo: function(locale) {
        this.langsvc.userLocale = locale;

        this.restartAfterSwitch();
    },


    restartAfterSwitch: function() {
        let wantRestart = this.prefs.getBoolPref("button.restartAfterSwitch");
        if (wantRestart)
            Application.restart();      // It could be canceled by the user
    },


    getWindowRelevantLocales: function() {
        let locales = this.langUtils.findRelevantLocales();

        if (locales.indexOf(this.windowLocale) == -1) { // If it isn't found...
            // TODO: The slicing can to be avoided, in some cases
            locales = locales.slice();
            locales.push(this.windowLocale);
        }
        return locales;
    },


    getLocaleName: function(locale) {
        return this.langUtils.buildLocaleName(locale, this.localeStrings);
    },


    getStringBundle: function(id) {
        return this.langUtils.getStringBundle(id, document);
    }
};


window.addEventListener("load", simplels);
window.addEventListener("unload", simplels);
