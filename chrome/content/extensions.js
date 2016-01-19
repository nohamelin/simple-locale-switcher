/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var simplels = {

    langsvc: null,

    strings: null,
    localeStrings: {languageNames: null, regionNames: null, formats: null},


    handleEvent: function(event) {
        switch (event.type) {
            case "DOMContentLoaded":
                window.removeEventListener("DOMContentLoaded", simplels);
                this.onContentLoad();
                break;

            case "unload":
                this.onUnload();
                break;
        }
    },


    onContentLoad: function() {
        Cu.import("chrome://simplels/content/modules/general.jsm", this);
        Cu.import("chrome://simplels/content/modules/language.jsm", this);

        this.langsvc = Cc["@nohamelin/sls/language-service;1"]
                       .getService().wrappedJSObject;

        this.strings = this.getStringBundle("simplels-strings");

        this.localeStrings.languageNames = this.getStringBundle(
                                                "simplels-language-names");
        this.localeStrings.regionNames = this.getStringBundle(
                                                "simplels-region-names");
        this.localeStrings.formats = this.getStringBundle(
                                                "simplels-name-formats");

        Services.obs.addObserver(this, "sls:selected-changed", false);

        this.updateSelectedItem();
        this.updateRestartBox();
    },


    onUnload: function() {
        Services.obs.removeObserver(this, "sls:selected-changed");
    },


    updateSelectedItem: function() {
        let selectedItem = document.getElementById("simplels-selected");

        if (this.langsvc.matchingOS) {
            selectedItem.value = this.strings.getString("selected.match");
            selectedItem.tooltipText = this.strings.getString(
                                            "selected.match.tooltiptext");
        } else {
            let userLocale = this.langsvc.userLocale;
            selectedItem.value = this.getLocaleName(userLocale);
            selectedItem.tooltipText = userLocale;
        }
    },


    updateRestartBox: function() {
        let restartBox = document.getElementById("simplels-restart-container");

        // Still for the cases when the selected locale changed back to the
        // original found at startup, a restart of the application can be
        // still necessary due to some places building their strings on load,
        // and being it not necessarily at startup, e.g. the Add-ons Manager
        // with the category names. So, after a switch of the selected locale,
        // this box will be always visible.
        restartBox.hidden = !this.langsvc.wasSelectedLocaleChanged;
    },


    observe: function(subject, topic, data) {
        switch (topic) {
            case "sls:selected-changed":
                this.updateSelectedItem();
                this.updateRestartBox();
                break;
        }
    },


    openLanguagesDialog: function() {
        let langsURL = "chrome://simplels/content/languages.xul";

        this.utils.openPreferencesWindow(window, langsURL);
    },


    openGetMoreLanguagesPage: function() {
        Cu.import("chrome://simplels/content/modules/langpacks.jsm", this);
        let getURL = this.getMoreLanguagesURL();

        switch (this.utils.application) {
            case this.THUNDERBIRD_ID:
                this.tbUtils.openContentTab(getURL);
                break;

            case this.FIREFOX_ID:
            case this.SEAMONKEY_ID:
            default:
                openURL(getURL);
                break;
        }
    },


    openLearnMoreAboutLanguagesPage: function() {
        Cu.import("chrome://simplels/content/modules/langpacks.jsm", this);
        let learnURL = this.learnMoreAboutLanguagesURL();

        switch (this.utils.application) {
            case this.THUNDERBIRD_ID:
                this.tbUtils.openContentTab(learnURL);
                break;

            case this.FIREFOX_ID:
            case this.SEAMONKEY_ID:
            default:
                openURL(learnURL);
                break;
        }
    },


    getLocaleName: function(locale) {
        return this.langUtils.buildLocaleName(locale, this.localeStrings);
    },


    getStringBundle: function(id) {
        return this.langUtils.getStringBundle(id, document);
    }
};


window.addEventListener("DOMContentLoaded", simplels);
window.addEventListener("unload", simplels);
