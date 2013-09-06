/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = [ "langUtils" ];

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

    /**
     * Build a pretty name for a language tag. The exact format is dependent of
     * the selected language. Examples (en-US locale):
     *
     *  eo        -->  Esperanto
     *  es-CL     -->  Spanish (Chile)
     *  ja-JP-mac -->  Japanese (Japan/mac)
     *  other     -->  "other"
     */
    buildLocaleName: function(locale, stringbundles) {
        let [ language, region, variant ] = locale.split(/[-_]/);
        let { languageNames, regionNames, formats } = stringbundles;

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

            if (variant)
                name = formats.getFormattedString("languageRegionVariantName",
                                                  [ languageName, regionName,
                                                    variant ]);
            else if (region)
                name = formats.getFormattedString("languageRegionName",
                                                  [ languageName, regionName ]);
            else
                name = formats.getFormattedString("languageName",
                                                  [ languageName ]);
        } catch (e) {
            name = formats.getFormattedString("unnamed", [ locale ]);
        }

        return name;
    },


    /**
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


    isLocaleAvailable: function(locale) {
        let i = 0, available;

        while (available = langsvc.availableLocales[i++]) {
            if (available == locale)
                return true;
        }
        return false;
    }
};
