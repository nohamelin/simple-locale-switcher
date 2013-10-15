/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var simplels = {

    langsvc: null,

    strings: null,
    localeStrings: { languageNames: null, regionNames: null, formats: null },


    handleEvent: function(event) {
        switch (event.type) {
            case "load" :
                this.onLoad();
                break;

            case "unload" :
                this.onUnload();
                break;
        }
    },


    onLoad: function() {
        document.removeEventListener("load", simplels, true);

        Cu.import("resource://simplels/general.jsm", this);
        Cu.import("resource://simplels/language.jsm", this);

        this.langsvc = Cc["@nohamelin/sls/language-service;1"]
                       .getService().wrappedJSObject;

        this.strings = document.getElementById("simplels-strings");

        this.localeStrings.languageNames = document.getElementById(
                                                "simplels-language-names");
        this.localeStrings.regionNames = document.getElementById(
                                                "simplels-region-names");
        this.localeStrings.formats = document.getElementById(
                                                "simplels-name-formats");

        Services.obs.addObserver(this, "sls:matching-changed", false);
        Services.obs.addObserver(this, "sls:selected-changed", false);

        this.updateSelectedItem();
    },


    onUnload: function() {
        Services.obs.removeObserver(this, "sls:matching-changed");
        Services.obs.removeObserver(this, "sls:selected-changed");
    },


    updateSelectedItem: function() {
        let selectedItem = document.getElementById("simplels-selected");

        if (this.langsvc.matchingOS) {
            selectedItem.value = this.strings.getString("selected.match");
            selectedItem.tooltipText = this.strings.getString(
                                            "selected.match.tooltiptext");
        }
        else {
            selectedItem.value = this.getLocaleName(this.langsvc.userLocale);
            selectedItem.tooltipText = this.langsvc.userLocale;
        }
    },


    observe: function(subject, topic, data) {
        switch (topic) {
            case "sls:matching-changed" :
            case "sls:selected-changed" :
                this.updateSelectedItem();
                break;
        }
    },


    openLanguagesDialog: function() {
        let langsURL = "chrome://simplels/content/languages-outer.xul";

        this.utils.openPreferencesWindow(window, langsURL);
    },


    openGetMoreLanguagesPage: function() {
        Cu.import("resource://simplels/urlFormatter.jsm", this);

        let prefs = Services.prefs.getBranch("extensions.simplels.");
        let getURL = this.utils.getComplexCharPref(prefs,
                                                   "getMoreLanguagesURL");
        getURL = this.formatURL(getURL);

        switch (this.utils.application) {
            case this.FIREFOX_ID :
                openURL(getURL);
                break;

            case this.THUNDERBIRD_ID :
                this.tbUtils.openContentTab(getURL);
                break;
        }
    },


    getLocaleName: function(locale) {
        return this.langUtils.buildLocaleName(locale, this.localeStrings);
    }
};


document.addEventListener("load", simplels, true);
window.addEventListener("unload", simplels);
