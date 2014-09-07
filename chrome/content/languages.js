/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://simplels/content/modules/general.jsm");
Cu.import("chrome://simplels/content/modules/language.jsm");


const LOCALE_PREF_NAME = "general.useragent.locale";
const MATCH_PREF_NAME = "intl.locale.matchOS";

XPCOMUtils.defineLazyGetter(this, "langsvc", function() {
    return Cc["@nohamelin/sls/language-service;1"].getService()
           .wrappedJSObject;
});


var simplels = {

    localeStrings: { languageNames: null, regionNames: null, formats: null },

    matchPref: null,
    localePref: null,


    onLoad: function() {
        this.localeStrings.languageNames = this.getStringBundle(
                                                "simplels-language-names");
        this.localeStrings.regionNames = this.getStringBundle(
                                                "simplels-region-names");
        this.localeStrings.formats = this.getStringBundle(
                                                "simplels-name-formats");

        this.matchPref = document.getElementById(MATCH_PREF_NAME);
        this.localePref = document.getElementById(LOCALE_PREF_NAME);

        if (langsvc.isUserLocaleLocalized) {
            this.localePref.type = "wstring";

            // After changing the type, we need to reinitialize the
            // preference. See:  /toolkit/content/widgets/preferences.xml
            let value = this.localePref.valueFromPreferences;
            this.localePref._setValue(value, false);
        }

        this.switchList = document.getElementById("switch-list");

        this.switchList.disabled = this.matchPref.value;
        this.populateSwitchList();
        this.localePref.updateElements();

        // Having a specific width for the XUL descriptions elements isn't
        // very well managed by default, so we need the next.
        window.sizeToContent();
    },


    onUpdateMatchPreference: function() {
        this.switchList.disabled = this.matchPref.value;

        if (langsvc.isUserLocaleLocalized)
            // When we have a localized localePref with its value set to the
            // default, toggling matchPref will affect this default value.
            // TODO: There are still some problems managing it if the
            // instantApply preference is false (uncommon, it isn't its default
            // value in platforms where localePref can be found localized)
            this.localePref.updateElements();
    },


    populateSwitchList: function() {
        let popup = document.getElementById("switch-popup");

        // This language selector always will work with the available locales
        // for the main application, no caring if the user have set a custom
        // locale provider.
        let pickedLocale = langsvc.userLocale;
        let isPickedAvailable = langUtils.isLocaleAvailable(pickedLocale, true);

        let locales = langUtils.findRelevantLocales(true);
        langUtils.sortLocales(locales);

        let popupFragment = document.createDocumentFragment();
        locales.forEach(function(locale) {
            let item = document.createElement("menuitem");

            item.className = "switch-locale";
            item.setAttribute("locale", locale);
            item.setAttribute("label", this.getLocaleName(locale));
            item.setAttribute("description", locale);
            item.setAttribute("tooltiptext", locale);
            item.setAttribute("value", locale);

            if (locale == pickedLocale && !isPickedAvailable)
                item.setAttribute("disabled", "true");

            popupFragment.appendChild(item);
        }, this);

        popup.appendChild(popupFragment);
    },


    restoreDefaults: function() {
        // Using reset(), onUpdateMatchPreference() isn't called
        // in some cases (Thunderbird in linux distributions: having matchPref
        // true by default and a not localized localePref). The next seems Ok.
        this.matchPref.value = this.matchPref.defaultValue;

        this.localePref.reset();
    },


    getLocaleName: function(locale) {
        return langUtils.buildLocaleName(locale, this.localeStrings);
    },


    getStringBundle: function(id) {
        return langUtils.getStringBundle(id, document);
    }
};
