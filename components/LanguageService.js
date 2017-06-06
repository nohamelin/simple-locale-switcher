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

XPCOMUtils.defineLazyModuleGetter(this, "AddonManager",
            "resource://gre/modules/AddonManager.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "prefs",
            "chrome://simplels/content/modules/preferences.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "logger",
            "chrome://simplels/content/modules/logger.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "scheduler",
            "chrome://simplels/content/modules/scheduler.jsm");


const DEFAULT_LOCALE_PROVIDER = "global";

const ADDON_ID = "simplels@nohamelin";
const ADDON_BRANCH_NAME = "extensions.simplels.";
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
    return Services.prefs.getBranch(ADDON_BRANCH_NAME);
});
XPCOMUtils.defineLazyGetter(this, "localeBranch", function() {
    return Services.prefs.getBranch(LOCALE_BRANCH_NAME);
});
XPCOMUtils.defineLazyGetter(this, "matchBranch", function() {
    return Services.prefs.getBranch(MATCH_BRANCH_NAME);
});


var languageService = null;

function LanguageService() {
    if (languageService)
        return languageService;    // Enforce single instance

    languageService = this;
    this.wrappedJSObject = this;
}


/*
 * A few definitions
 * -----------------
 *
 * A "language tag" is a string identifying a single language; its format
 * is the defined by the IETF's BCP 47 document:
 *   http://tools.ietf.org/html/bcp47
 *
 * ...though this service doesn't make any assumption about the internal
 * structure of these strings. The language.jsm module deals with that.
 *
 * The term "locale" is loosely used here as a synonym of language tag;
 * it's never about objects implementing the nsILocale interface, as
 * nsILocaleService does:
 *   https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsILocale
 *   https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsILocaleService
 */
LanguageService.prototype = {

    classID: Components.ID("{92ffb138-103f-11e2-84fe-286f6188709b}"),
    QueryInterface:	XPCOMUtils.generateQI([Ci.nsIObserver]),


    /*
     * A language tag associated to the preferred language for the UI of
     * applications, according to the operating system.
     */
    get osLocale() {
        if (!("_osLocale" in this)) {
            this._osLocale = ls.getSystemLocale()
                               .getCategory("NSILOCALE_MESSAGES");
        }
        return this._osLocale;
    },


    /*
     * A language tag associated to the "nearest" language to the preferred
     * language, selected between the currently available locales for the
     * application, and effectively used for new windows and chrome pages.
     *
     * Changes to how the application figures this "best-match" is out of the
     * defined scope for this add-on; there are a few, old enhancement bugs
     * about that:
     *   https://bugzilla.mozilla.org/show_bug.cgi?id=288670
     */
    get currentLocale() {
        return xcr.getSelectedLocale(DEFAULT_LOCALE_PROVIDER);
    },


    /*
     * A language tag associated to the preferred, expected language for the
     * UI of the application (no caring about availability).
     */
    get selectedLocale() {
        // WARN: It's wrong. It should take into account if the application
        // was launched with the -UILocale command-line flag, but it seems
        // that we don't have a reliable way to figure it: the application
        // manages the flag and hides the language tag passed as parameter
        // in a very early runtime stage, a point unreachable for an add-on.
        // See:
        // http://mxr.mozilla.org/mozilla-release/source/chrome/nsChromeRegistryChrome.cpp?rev=fba67babe664#327
        return this.matchingOS ? this.osLocale : this.userLocale;
    },


    _onChangedSelectedLocale: function() {
        delete this._matchingOS;
        delete this._userLocale;
        delete this._isMatchingOSLocked;
        delete this._isUserLocaleLocked;

        this._wasSelectedLocaleChanged = true;

        Services.obs.notifyObservers(null, "sls:selected-changed", null);
    },


    /*
     * The selected locale found at the startup of the application.
     */
    _initialSelectedLocale: null,


    get initialSelectedLocale() {
        return this._initialSelectedLocale;
    },


    /*
     * Remember if the selected locale has been changed at least one time
     * during the execution of the application.
     */
    _wasSelectedLocaleChanged: false,


    get wasSelectedLocaleChanged() {
        return this._wasSelectedLocaleChanged;
    },


    /*
     * An object mapping each chrome package selected as locale provider
     * with a collection of language tags: all the available languages that
     * can be effectively applied to that package.
     */
    _availableLocales: new Map(),


    getAvailableLocales: function(fromGlobalProvider) {
        let provider = fromGlobalProvider ? DEFAULT_LOCALE_PROVIDER
                                          : this.selectedProvider;

        if (!this._availableLocales.has(provider)) {
            this._availableLocales.set(provider, new Array());

            let availables = tcr.getLocalesForPackage(provider);
            while (availables.hasMore())
                this._availableLocales.get(provider).push(availables.getNext());
        }
        return this._availableLocales.get(provider);
    },


    _onChangedAvailableLocales: function() {
        this._availableLocales.clear();

        Services.obs.notifyObservers(null, "sls:availables-changed", null);
    },


    /*
     * intl.locale.matchOS
     *
     * This preference determines if the preferred language for the UI is
     * taken from the OS (if true) or from the general.useragent.locale
     * preference.
     *
     * It can be overridden by the -UILocale command-line parameter.
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


    get isMatchingOSLocked() {
        if (!("_isMatchingOSLocked" in this)) {
            this._isMatchingOSLocked = Services.prefs.prefIsLocked(
                                                      MATCH_PREF_NAME);
        }
        return this._isMatchingOSLocked;
    },


    resetMatchingOS: function() {
        Services.prefs.clearUserPref(MATCH_PREF_NAME);
    },


    /*
     * general.useragent.locale
     *
     * This preference stores the language tag corresponding to the preferred
     * language for the UI.
     *
     * It's ignored when the intl.locale.matchOS preference is true or the
     * -UILocale command-line parameter is used.
     *
     * In some cases (e.g. builds provided by some Linux distributions) it
     * can be found as a localized, complex preference, with its default value
     * read dynamically from:
     *   chrome://global/locale/intl.properties
     */
    get userLocale() {
        if (!("_userLocale" in this)) {
            this._userLocale = prefs.getCharOrLocalizedCharPref(localeBranch,
                                                                "locale");
        }
        return this._userLocale;
    },


    set userLocale(locale) {
        if (!locale) return;

        if (this.matchingOS)
            this.matchingOS = false;

        if (locale !== this.userLocale)
            Services.prefs.setCharPref(LOCALE_PREF_NAME, locale);
    },


    get isUserLocaleLocalized() {
        if (!("_isUserLocaleLocalized" in this)) {
            this._isUserLocaleLocalized = prefs.isDefaultCharPrefLocalized(
                                                LOCALE_PREF_NAME);
        }
        return this._isUserLocaleLocalized;
    },


    get isUserLocaleLocked() {
        if (!("_isUserLocaleLocked" in this)) {
            this._isUserLocaleLocked = Services.prefs.prefIsLocked(
                                                      LOCALE_PREF_NAME);
        }
        return this._isUserLocaleLocked;
    },


    resetUserLocale: function() {
        Services.prefs.clearUserPref(LOCALE_PREF_NAME);
    },


    /*
     * extensions.simplels.applyOnQuit.matchOS
     *
     * A volatile (without an explicit default value) preference.
     * Its existence is checked during the shutdown of the application, where
     * its value is copied to the intl.locale.matchOS preference, and then
     * this preference is reset.
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
        addonBranch.clearUserPref("applyOnQuit.matchOS");
    },


    /*
     * extensions.simplels.applyOnQuit.locale
     *
     * A volatile (without an explicit default value) preference.
     * Its existence is checked during the shutdown of the application, where
     * its value is copied to the general.useragent.locale preference, setting
     * intl.locale.matchOS to false if it's required, and then this preference
     * is reset.
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
        addonBranch.clearUserPref("applyOnQuit.locale");
    },


    /*
     * extensions.simplels.provider
     *
     * Name of the chrome package from whom the list of available locales is
     * obtained. It can be any package registered as a locale provider via a
     * chrome.manifest file. Names of packages unknown for the application,
     * or of packages without locales associated to them will be ignored.
     *
     * WARN: some events that unregister the selected package aren't detected
     * currently (e.g. a restartless disabling of the extension providing it),
     * letting effectively to have selected an unknown package and therefore
     * having here wrong cached data about the current available locales.
     * Triggering an event that rebuild that data can fix the latter issue,
     * that until a new change of the provider preference or a restart of the
     * application is finally done.
     */
    get selectedProvider() {
        if (!("_selectedProvider" in this)) {
            // Chrome packages have their names normalized to lowercase when
            // they are registered.
            let provider = addonBranch.getCharPref("provider").toLowerCase();

            if (!provider || provider === DEFAULT_LOCALE_PROVIDER) {
                this._selectedProvider = DEFAULT_LOCALE_PROVIDER;
            } else {
                try {
                    xcr.getSelectedLocale(provider);
                    this._selectedProvider = provider;
                } catch (e) {
                    logger.warning("impossible to get the preferred locale " +
                                   "for the specified locale provider " +
                                   "'" + provider + "'. The defaults will " +
                                   "be used.");

                    this._selectedProvider = DEFAULT_LOCALE_PROVIDER;
                }
            }
        }
        return this._selectedProvider;
    },


    get isSelectedProviderDefault() {
        return this.selectedProvider === DEFAULT_LOCALE_PROVIDER;
    },


    _onChangedSelectedProvider: function() {
        if (!this.isSelectedProviderDefault) {
            // Force to the list of available locales for the custom provider
            // being currently changed to be rebuilt the next time that this
            // same provider will be selected by the user, because undetected
            // changes can happen to this data meanwhile.
            this._availableLocales.delete(this._selectedProvider);
        }
        delete this._selectedProvider;

        Services.obs.notifyObservers(null, "sls:availables-changed", null);
    },


    resetSelectedProvider: function() {
        addonBranch.clearUserPref("provider");
    },


    ///////////////////////////////////////////////////////////////////////////
    startup: function() {
        addonBranch.addObserver("", this, false);
        localeBranch.addObserver("", this, false);
        matchBranch.addObserver("", this, false);

        this._initialSelectedLocale = this.selectedLocale;

        // Support for restartless language packs.
        // It's worth noting that Gecko 47 changed which events are broadcasted
        // when the availability of an add-on changes:
        //    https://bugzilla.mozilla.org/show_bug.cgi?id=612168
        //
        // The respective documentation in MDN hasn't been updated to reflect
        // that changes.
        AddonManager.addInstallListener(this.installListener);
        AddonManager.addAddonListener(this.addonListener);

        Services.obs.addObserver(this, "quit-application", false);


        // The "locale" add-on type is registered in the Add-ons Manager with
        // the TYPE_UI_HIDE_EMPTY flag, so that "the type should be hidden
        // from the UI if no add-ons of that type are currently installed".
        // We undo it zeroing the flag.
        AddonManager.addonTypes["locale"].flags ^= AddonManager
                                                   .TYPE_UI_HIDE_EMPTY;
    },


    shutdown: function() {
        addonBranch.removeObserver("", this);
        localeBranch.removeObserver("", this);
        matchBranch.removeObserver("", this);

        AddonManager.removeInstallListener(this.installListener);
        AddonManager.removeAddonListener(this.addonListener);

        Services.obs.removeObserver(this, "quit-application");


        AddonManager.getAddonByID(ADDON_ID, function(addon) {
            let addonDisabledAfterRestart = addon.pendingOperations &
                                            AddonManager.PENDING_DISABLE;
            let addonUninstalledAfterRestart = addon.pendingOperations &
                                               AddonManager.PENDING_UNINSTALL;
            let addonAvailableAfterRestart = !addonDisabledAfterRestart &&
                                             !addonUninstalledAfterRestart;

            if (languageService.nextLocale !== undefined) {
                // Don't give surprises to the user *after* that this add-on
                // was uninstalled or disabled.
                if (addonAvailableAfterRestart)
                    languageService.userLocale = languageService.nextLocale;

                languageService._resetNextLocale();
            }
            if (languageService.willMatchOS !== undefined) {
                // Don't give surprises to the user *after* that this add-on
                // was uninstalled or disabled.
                if (addonAvailableAfterRestart)
                    languageService.matchingOS = languageService.willMatchOS;

                languageService._resetWillMatchOS();
            }
        });
    },


    observe: function(subject, topic, data) {
        switch (topic) {
            case "profile-after-change":
                this.startup();
                break;

            case "quit-application":
                this.shutdown();
                break;

            case "nsPref:changed":
                switch (data) {
                    case "matchOS":
                    case "locale":
                        scheduler.queue("selected-changed", function() {
                            languageService._onChangedSelectedLocale();
                        }, 40);
                        break;

                    case "provider":
                        this._onChangedSelectedProvider();
                        break;

                    case "applyOnQuit.matchOS":
                        this._onChangedWillMatchOS();
                        break;

                    case "applyOnQuit.locale":
                        this._onChangedNextLocale();
                        break;
                }
                break;
        }
    },


    installListener: {
        // The install (and immediate enabling) of a restartless language pack
        // doesn't trigger the onEnabled event in our addonListener, so the
        // next is required too.
        onInstallEnded: function(install, addon) {
            if (install.type === "locale" && addon.isActive) {
                // A little delay is always required here to let to the
                // Toolkit Chrome Registry learns about the new locale, but
                // the queue is to try to prevent too triggering it multiples
                // times when a bunch of language packs are [un]installed at
                // the same time (e.g. using the "Install Add-on From File..."
                // tool of the Add-ons Manager).
                scheduler.queue("addon-install-ended", function() {
                    languageService._onChangedAvailableLocales();
                }, 80);
            }
        }
    },


    addonListener: {
        onEnabled: function(addon) {
            if (addon.type === "locale")
                this._handle();
        },

        onDisabled: function(addon) {
            if (addon.type === "locale")
                this._handle();
        },

        onUninstalling: function(addon) {
            if (addon.type === "locale" && addon.isActive)
                this._handle();
        },

        onOperationCancelled: function(addon) {
            if (addon.type === "locale" && !addon.userDisabled)
                this._handle();
        },

        _handle: function() {
            // At this point the Toolkit Chrome Registry already know about
            // the change of availability of the locale; the queue is to try
            // to prevent running it multiples times, although I don't know
            // any public tool to batch enabling/disabling of language packs.
            scheduler.queue("addon-availability-changed", function() {
                languageService._onChangedAvailableLocales();
            }, 80);
        }
    }
};


const NSGetFactory = XPCOMUtils.generateNSGetFactory([LanguageService]);
