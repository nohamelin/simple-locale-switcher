/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");
Cu.import("resource://simplels/general.jsm");
Cu.import("resource://simplels/scheduler.jsm");


const DEFAULT_PACKAGE = "global";

const SLS_BRANCH_NAME = "extensions.simplels.";
const LOCALE_BRANCH_NAME = "general.useragent.";
const LOCALE_PREF_NAME = "general.useragent.locale";
const MATCH_BRANCH_NAME = "intl.locale.";
const MATCH_PREF_NAME = "intl.locale.matchOS";

XPCOMUtils.defineLazyServiceGetter(this, "xcr",
                                   "@mozilla.org/chrome/chrome-registry;1",
                                   "nsIXULChromeRegistry");
XPCOMUtils.defineLazyServiceGetter(this, "tcr",
                                   "@mozilla.org/chrome/chrome-registry;1",
                                   "nsIToolkitChromeRegistry");
XPCOMUtils.defineLazyServiceGetter(this, "ls",
                                   "@mozilla.org/intl/nslocaleservice;1",
                                   "nsILocaleService");

XPCOMUtils.defineLazyGetter(this, "addonBranch", function() {
    return Services.prefs.getBranch(SLS_BRANCH_NAME);
});
XPCOMUtils.defineLazyGetter(this, "localeBranch", function() {
    return Services.prefs.getBranch(LOCALE_BRANCH_NAME);
});
XPCOMUtils.defineLazyGetter(this, "matchBranch", function() {
    return Services.prefs.getBranch(MATCH_BRANCH_NAME);
});


var languageService = null;

function LanguageService() {
    if (languageService) return languageService;    // Enforce single instance
    languageService = this;

    this.wrappedJSObject = this;                    // TODO: Get rid of it
}


LanguageService.prototype = {

    classID: Components.ID("{92ffb138-103f-11e2-84fe-286f6188709b}"),
    QueryInterface:	XPCOMUtils.generateQI([ Ci.nsIObserver ]),


    /**
     * A language tag associated to the user preference for locale from the
     * operating system.
     */
    get osLocale() {
        if (!("_osLocale" in this)) {
            this._osLocale = ls.getSystemLocale()
                               .getCategory("NSILOCALE_MESSAGES");
        }
        return this._osLocale;
    },


    /**
     * A language tag associated to the locale being used by the current main
     * window. It can be different of the expected, selected locale if the last
     * isn't available.
     */
    get currentLocale() {
        return xcr.getSelectedLocale(DEFAULT_PACKAGE);
    },


    /**
     * A language tag associated to the preferred, expected (if available)
     * locale.
     */
    get selectedLocale() {
        // TODO: It's wrong. It should take into account if the application
        // was launched with the -UILocale command-line flag, but it seems that
        // there isn't a reliable way for to figure it: the flag is managed by
        // the application in a very early stage, a point unreachable to an
        // add-on. See:
        // http://mxr.mozilla.org/mozilla-release/source/chrome/src/nsChromeRegistryChrome.cpp?rev=21cd4d9e679b#371
        return this.matchingOS ? this.osLocale : this.userLocale;
    },


    _onChangedSelectedLocale: function() {
        delete this._matchingOS;
        delete this._userLocale;
        Services.obs.notifyObservers(null, "sls:selected-changed", null);
    },


    /**
     * A collection of language tags, associated to any available language that
     * can be effectively applied.
     */
    get availableLocales() {
        if (!("_availableLocales" in this)) {
            this._availableLocales = new Array();

            let availables = tcr.getLocalesForPackage(DEFAULT_PACKAGE);
            while (availables.hasMore())
                this._availableLocales.push(availables.getNext());
        }
        return this._availableLocales;
    },


    _onChangedAvailableLocales: function() {
        delete this._availableLocales;
        Services.obs.notifyObservers(null, "sls:availables-changed", null);
    },


    /**
     * intl.locale.matchOS
     *
     * This system preference determines if the application's UI language is
     * decided from the OS (if true) or from the general.useragent.locale
     * preference.
     */
    get matchingOS() {
        if (!("_matchingOS" in this)) {
            this._matchingOS = Services.prefs.getBoolPref(MATCH_PREF_NAME);
        }
        return this._matchingOS;
    },


    set matchingOS(shouldMatch) {
        Services.prefs.setBoolPref(MATCH_PREF_NAME, shouldMatch);
    },


    resetMatchingOS: function() {
        Services.prefs.clearUserPref(MATCH_PREF_NAME);
    },


    /**
     * general.useragent.locale
     *
     * A system preference, a language tag according to the BCP 47 standard
     * (i.e. "en-US", "fr"), corresponding to the desired locale for the
     * application. It's ignored if the intl.locale.matchOS preference is true.
     * Changing its value will not affect to existent windows, but it will be
     * effective for new windows and new chrome pages (i.e. about:addons).
     *
     * It's in some cases (some linux distributions) a localized preference,
     * with its default value read from:
     *   chrome://global/locale/intl.properties
     */
    get userLocale() {
        if (!("_userLocale" in this)) {
            this._userLocale = utils.getCharOrLocalizedCharPref(localeBranch,
                                                                "locale");
        }
        return this._userLocale;
    },


    set userLocale(locale) {
        if (!locale) return;

        if (this.matchingOS)
            this.matchingOS = false;

        if (locale != this.userLocale)
            Services.prefs.setCharPref(LOCALE_PREF_NAME, locale);
    },


    get isUserLocaleLocalized() {
        if (!("_isUserLocaleLocalized" in this)) {
            this._isUserLocaleLocalized = utils.isDefaultCharPrefLocalized(
                                                LOCALE_PREF_NAME);
        }
        return this._isUserLocaleLocalized;
    },


    resetUserLocale: function() {
        Services.prefs.clearUserPref(LOCALE_PREF_NAME);
    },


    /**
     * extensions.simplels.applyOnQuit.matchOS
     *
     * It and the next are volatile (without a explicit default value) prefs.
     * Their existences are checked on quit, where its value is set to the
     * intl.locale.matchOS and general.useragent.locale preferences,
     * respectively, for their use during the next execution.
     */
    get willMatchOS() {
        if (!("_willMatchOS" in this)) {
            try {
                this._willMatchOS = addonBranch.getBoolPref(
                                                "applyOnQuit.matchOS");
            } catch (e) {
                return undefined;
            }
        }
        return this._willMatchOS;
    },


    _onChangedWillMatchOS: function() {
        delete this._willMatchOS;
        Services.obs.notifyObservers(null, "sls:selected-will-change", null);
    },


    _resetWillMatchOS: function() {
        addonBranch.clearUserPref("applyOnQuit.matchOS");   // It never throws
    },


    /**
     * extensions.simplels.applyOnQuit.locale
     */
    get nextLocale() {
        if (!("_nextLocale" in this)) {
            try {
                this._nextLocale = addonBranch.getCharPref(
                                               "applyOnQuit.locale");
            } catch (e) {
                return undefined;
            }
        }
        return this._nextLocale;
    },


    _onChangedNextLocale: function() {
        delete this._nextLocale;
        Services.obs.notifyObservers(null, "sls:selected-will-change", null);
    },


    _resetNextLocale: function() {
        addonBranch.clearUserPref("applyOnQuit.locale");    // It never throws
    },


    ///////////////////////////////////////////////////////////////////////////
    startup: function() {
        addonBranch.QueryInterface(Ci.nsIPrefBranch2);  // COMPAT: Gecko 12-
        addonBranch.addObserver("", this, false);
        localeBranch.QueryInterface(Ci.nsIPrefBranch2); // COMPAT: Gecko 12-
        localeBranch.addObserver("", this, false);
        matchBranch.QueryInterface(Ci.nsIPrefBranch2);  // COMPAT: Gecko 12-
        matchBranch.addObserver("", this, false);

        // Supporting restartless language packs (Gecko 21 and later)
        AddonManager.addInstallListener(this.installListener);
        AddonManager.addAddonListener(this.addonListener);

        Services.obs.addObserver(this, "quit-application", false);
    },


    shutdown: function() {
        addonBranch.removeObserver("", this);
        localeBranch.removeObserver("", this);
        matchBranch.removeObserver("", this);

        AddonManager.removeInstallListener(this.installListener);
        AddonManager.removeAddonListener(this.addonListener);

        Services.obs.removeObserver(this, "quit-application");

        //
        if (this.nextLocale !== undefined) {
            this.userLocale = this.nextLocale;
            this._resetNextLocale();
        }
        if (this.willMatchOS !== undefined) {
            this.matchingOS = this.willMatchOS;
            this._resetWillMatchOS();
        }
    },


    observe: function(subject, topic, data) {
        switch (topic) {
            case "profile-after-change" :
                this.startup();
                break;

            case "quit-application" :
                this.shutdown();
                break;

            case "nsPref:changed" :
                switch (data) {
                    case "matchOS" :
                    case "locale" :
                        scheduler.queue("selected-changed", function() {
                            languageService._onChangedSelectedLocale();
                        }, 40);
                        break;

                    case "applyOnQuit.matchOS" :
                        this._onChangedWillMatchOS();
                        break;

                    case "applyOnQuit.locale" :
                        this._onChangedNextLocale();
                        break;
                }
                break;
        }
    },


    installListener: {
        onInstallEnded: function(install, addon) {
            // There isn't much harm if the locale add-on is actually for
            // another extension instead of the main application
            if (install.type == "locale" && addon.isActive)
                scheduler.queue("install-ended", function() {
                    languageService._onChangedAvailableLocales();
                }, 40);
        }
    },


    addonListener: {
        onEnabled: function(addon) {
            // There isn't much harm if the locale add-on is actually for
            // another extension instead of the main application
            if (addon.type == "locale")
                languageService._onChangedAvailableLocales();
        },

        onDisabled: function(addon) {
            if (addon.type == "locale")
                languageService._onChangedAvailableLocales();
        },

        onInstalled: function(addon) {
            if (addon.type == "locale")
                languageService._onChangedAvailableLocales();
        },

        onUninstalled: function(addon) {
            if (addon.type == "locale")
                languageService._onChangedAvailableLocales();
        }
    }
};


const NSGetFactory = XPCOMUtils.generateNSGetFactory([ LanguageService ]);
