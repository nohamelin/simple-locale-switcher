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
        this.localeStrings.languageNames = document.getElementById(
                                                "simplels-language-names");
        this.localeStrings.regionNames = document.getElementById(
                                                "simplels-region-names");
        this.localeStrings.formats = document.getElementById(
                                                "simplels-name-formats");

        this.matchPref = document.getElementById(MATCH_PREF_NAME);
        this.localePref = document.getElementById(LOCALE_PREF_NAME);

        if (langsvc.isUserLocaleLocalized) {
            // Having a static value for the preference's type (either "string"
            // or "wstring") doesn't work in all the cases.
            this.localePref.type = "wstring";
            this._reinitializeLocalePreference();

            // TODO: As the default value of the preference is dependent of the
            // current locale, reseting directly the preference doesn't work as
            // expected. As the user can't do anything about it, the respective
            // button will be hidden.
            let restoreBox = document.getElementById("restore-defaults-box");
            restoreBox.hidden = true;
        }

        //
        this.onUpdateMatchPreference();

        this.populateSwitchList();
        this.localePref.updateElements();
    },


    onBeforeAccept: function() {
        let instantApply = Services.prefs.getBoolPref(
                                          "browser.preferences.instantApply");

        // HACK: It's a temporary workaround for
        //       https://bugzilla.mozilla.org/show_bug.cgi?id=738797#c3
        // If the instantApply preference is false (by default in Windows),
        // our preferences aren't saved when the window is closed if it was
        // open from about:preferences, because of its "child" type.
        if (!instantApply && window.opener
            && window.opener.document.documentElement.localName == "page") {

            // Changing the "type" attribute on closing only should impact
            // (without problems) to the handler of the dialogaccept event.
            document.documentElement.setAttribute("type", "");
        }

        return true;
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
        let switchList = document.getElementById("switch-list");

        switchList.disabled = this.matchPref.value;
    },


    populateSwitchList: function() {
        let popup = document.getElementById("switch-popup");

        let pickedLocale = langsvc.userLocale;
        let isPickedAvailable = langUtils.isLocaleAvailable(pickedLocale);

        // Build the set of displayed locales
        let locales = langsvc.availableLocales;
        if (!isPickedAvailable) {
            locales = locales.slice();
            locales.push(pickedLocale);
        }
        langUtils.sortLocales(locales);

        //
        locales.forEach(function(locale) {
            let item = document.createElement("menuitem");
            popup.appendChild(item);

            item.className = "switch-locale";
            item.id = "switch-locale-" + locale;
            item.setAttribute("label", this.getLocaleName(locale));
            item.setAttribute("description", locale);
            item.setAttribute("tooltiptext", locale);
            item.setAttribute("value", locale);

            if (locale == pickedLocale && !isPickedAvailable)
                item.setAttribute("disabled", true);
        }, this);
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
    }
};
