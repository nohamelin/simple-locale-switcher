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
Cu.import("resource://simplels/general.jsm");
Cu.import("resource://simplels/language.jsm");


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
        Cu.import("resource://simplels/language.jsm", this);

        this.localeStrings.languageNames = this.getStringBundle(
                                                "simplels-language-names");
        this.localeStrings.regionNames = this.getStringBundle(
                                                "simplels-region-names");
        this.localeStrings.formats = this.getStringBundle(
                                                "simplels-name-formats");

        this.matchPref = document.getElementById(MATCH_PREF_NAME);
        this.localePref = document.getElementById(LOCALE_PREF_NAME);

        if (langsvc.isUserLocaleLocalized) {
            // Having a static value for the preference's type (either "string"
            // or "wstring") doesn't work in all the cases.
            this.localePref.type = "wstring";
            this._reinitializeLocalePreference();
        }

        this.switchList = document.getElementById("switch-list");

        this.switchList.disabled = this.matchPref.value;
        this.populateSwitchList();
        this.localePref.updateElements();

        // Having a specific width for the XUL descriptions elements isn't
        // very well managed by default, so we need the next.
        window.sizeToContent();
    },


    _reinitializeLocalePreference: function() {
        // TODO: It's basically the same as the preference's constructor. Maybe
        // is possible to use that directly.
        // SOURCE: /toolkit/content/widgets/preferences.xml
        let parentPref = null;
        if (!this.localePref.instantApply && window.opener) {
            let pdoc = window.opener.document;

            let prefSets = pdoc.getElementsByTagName("preferences");
            for (let k = 0; k < prefSets.length && !parentPref; ++k) {
                let prefs = prefSets[k].getElementsByAttribute(
                                        "name", this.localePref.name);

                for (let l = 0; l < prefs.length && !parentPref; ++l) {
                    if (prefs[l].localName == "preference")
                        parentPref = prefs[l];
                }
            }
        }
        let value = parentPref ? parentPref.value
                               : this.localePref.valueFromPreferences;
        this.localePref._setValue(value, false);
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

        let pickedLocale = langsvc.userLocale;
        let isPickedAvailable = langUtils.isLocaleAvailable(pickedLocale);

        let locales = langUtils.findRelevantLocales();
        langUtils.sortLocales(locales);

        let popupFragment = document.createDocumentFragment();
        locales.forEach(function(locale) {
            let item = document.createElement("menuitem");

            item.className = "switch-locale";
            item.id = "switch-locale-" + locale;
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
        return this.langUtils.getStringBundle(id, document);
    }
};
