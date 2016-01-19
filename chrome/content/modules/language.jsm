/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["langUtils"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");


XPCOMUtils.defineLazyGetter(this, "langsvc", function() {
    return Cc["@nohamelin/sls/language-service;1"].getService()
           .wrappedJSObject;
});


var langUtils = {

    /*
     * Build a pretty name for a language tag. The exact format is dependent of
     * the localization work. Examples (en-US):
     *
     *  eo        -->  Esperanto
     *  es-CL     -->  Spanish (Chile)
     *  ja-JP-mac -->  Japanese (Japan/mac)
     *  other     -->  "other"
     *
     * Note that only tags with those forms used currently by language packs
     * are recognized. TODO: Manage any valid tag according to BCP 47.
     */
    buildLocaleName: function(locale, stringbundles) {
        let {languageNames, regionNames, formats} = stringbundles;

        if (locale === "")
            return formats.getString("unspecified");

        let [language, region, variant] = locale.split(/[-_]/);
        let languageName, regionName, name;
        try {
            languageName = languageNames.getString(language.toLowerCase());
            if (region) {
                try {
                    regionName = regionNames.getString(region.toLowerCase());
                } catch (e) {
                    regionName = region;
                }
            }

            if (variant) {
                name = formats.getFormattedString("languageRegionVariantName",
                                                  [languageName,
                                                   regionName,
                                                   variant]);
            } else if (region) {
                name = formats.getFormattedString("languageRegionName",
                                                  [languageName, regionName]);
            } else {
                name = languageName;
            }
        } catch (e) {
            name = formats.getFormattedString("unnamed", [locale]);
        }

        return name;
    },


    getStringBundle: function(id, document) {
        let stringBundle = document.getElementById(id);

        // Ensure that the src URI of the stringbundle is resolved now,
        // not later (in first use, a event that can be delayed), because
        // the preferred locale may be different then.
        // It prevents, for example, building names in mixed languages.
        stringBundle.strings;

        return stringBundle;
    },


    /*
     * Sort an Array of language tags.
     *
     * Sorting languages by name can to seems more natural, but the resulting
     * order will be dependent of the selected language. TODO: Let it anyway.
     */
    sortLocales: function(locales) {
        let comparer = function(locale, otherLocale) {
            return locale.localeCompare(otherLocale);
        };

        locales.sort(comparer);
    },


    findRelevantLocales: function(fromGlobalProvider) {
        let locales = langsvc.getAvailableLocales(fromGlobalProvider);

        if (locales.indexOf(langsvc.userLocale) === -1) { // If it isn't found:
            locales = locales.slice();
            locales.push(langsvc.userLocale);
        }
        return locales;
    },


    isLocaleAvailable: function(locale, fromGlobalProvider) {
        let availableLocales = langsvc.getAvailableLocales(fromGlobalProvider);
        let i = 0, available;

        while ((available = availableLocales[i++])) {   // it's an assignment
            if (available === locale)
                return true;
        }
        return false;
    }
};
