/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = [
    "FIREFOX_ID",
    "THUNDERBIRD_ID",
    "utils",
    "tbUtils"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");


function getComplexValue(branch, prefName, type) {
    return branch.getComplexValue(prefName, type).data;
}

function setComplexValue(branch, prefName, type, value) {
    let cs = Cc["@mozilla.org/supports-string;1"].createInstance(type);

    cs.data = value;
    branch.setComplexValue(prefName, type, cs);
}


const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";


var utils = {

    getComplexCharPref: function(branch, prefName) {
        return getComplexValue(branch, prefName, Ci.nsISupportsString);
    },


    setComplexCharPref: function(branch, prefName, value) {
        setComplexValue(branch, prefName, Ci.nsISupportsString, value);
    },


    getLocalizedCharPref: function(branch, prefName) {
        return getComplexValue(branch, prefName, Ci.nsIPrefLocalizedString);
    },


    setLocalizedCharPref: function(branch, prefName, value) {
        setComplexValue(branch, prefName, Ci.nsIPrefLocalizedString, value);
    },


    isCharPrefLocalized: function(branch, prefName) {
        let value = this.getComplexCharPref(branch, prefName);

        // SOURCE: about:config
        return /^chrome:\/\/.+\/locale\/.+\.properties/.test(value);
    },


    getCharOrLocalizedCharPref: function(branch, prefName) {
        // isCharPrefLocalized() could be used but the next seems faster
        try {
            return this.getLocalizedCharPref(branch, prefName);
        } catch (e) {
            return branch.getCharPref(prefName);
        }
    },


    ///////////////////////////////////////////////////////////////////////////
    getDefaultCharPref: function(branchName, prefName) {
        let branch = Services.prefs.getDefaultBranch(branchName);

        return branch.getCharPref(prefName);
    },


    setDefaultCharPref: function(branchName, prefName, value) {
        let branch = Services.prefs.getDefaultBranch(branchName);

        branch.setCharPref(prefName, value);
    },


    getDefaultComplexCharPref: function(branchName, prefName) {
        let branch = Services.prefs.getDefaultBranch(branchName);

        return this.getComplexCharPref(branch, prefName);
    },


    setDefaultComplexCharPref: function(branchName, prefName, value) {
        let branch = Services.prefs.getDefaultBranch(branchName);

        this.setComplexCharPref(branch, prefName, value);
    },


    getDefaultLocalizedCharPref: function(branchName, prefName) {
        let branch = Services.prefs.getDefaultBranch(branchName);

        return this.getLocalizedCharPref(branch, prefName);
    },


    setDefaultLocalizedCharPref: function(branchName, prefName, value) {
        let branch = Services.prefs.getDefaultBranch(branchName);

        this.setLocalizedCharPref(branch, prefName, value);
    },


    isDefaultCharPrefLocalized: function(branchName, prefName) {
        let branch = Services.prefs.getDefaultBranch(branchName);

        return this.isCharPrefLocalized(branch, prefName);
    },


    getDefaultCharOrLocalizedCharPref: function(branchName, prefName) {
        // isDefaultCharPrefLocalized() could be used but the next seems faster
        try {
            return this.getDefaultLocalizedCharPref(branchName, prefName);
        } catch (e) {
            return this.getDefaultCharPref(branchName, prefName);
        }
    },


    ///////////////////////////////////////////////////////////////////////////
    get os() {
        if (!("_os" in this)) {
            this._os = Services.appinfo.OS.toLowerCase();
        }
        return this._os;
    },


    get application() {
        if (!("_application" in this)) {
            this._application = Services.appinfo.ID;
        }
        return this._application;
    },


    get channel() {
        if (!("_channel" in this)) {
            // COMPAT TODO: use the existent module (Gecko 18 and later):
            //   resource://gre/modules/UpdateChannel.jsm

            // User values for the app.update.channel preference are ignored
            // by the application "for to ensure that the channel is tightly
            // coupled with the application and does not apply to other
            // instances that may use the same profile".
            try {
                this._channel = this.getDefaultCharPref("",
                                                        "app.update.channel");
            } catch (e) {
                // Some builds (linux distributions) may not have this
                // preference.
                this._channel = "default";
            }

            // For now, we can to ignore the partnership bits for the channel
            // string.
        }
        return this._channel;
    },


    ///////////////////////////////////////////////////////////////////////////
    /**
     * JS module implementation of nsIDOMJSWindow.setTimeout and .clearTimeout
     *
     * SOURCE:
     * Backport of resource://gre/modules/Timer.jsm (Gecko 23 and later)
     */
    _nextTimeoutId: 1,
    _timeoutTable: {},  // COMPAT: Map() no available in Gecko 12 and before

    setTimeout: function(callback, delay) {
        let id = this._nextTimeoutId++;
        let args = Array.slice(arguments, 2);
        let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

        timer.initWithCallback({
            notify: function(timer) {
                delete utils._timeoutTable[id];
                callback.apply(null, args);
            }
        }, delay, Ci.nsITimer.TYPE_ONE_SHOT);

        this._timeoutTable[id] = timer;
        return id;
    },


    clearTimeout: function clearTimeout(id) {
        if (this._timeoutTable[id]) {
            this._timeoutTable[id].cancel();
            delete this._timeoutTable[id];
        }
    },


    ///////////////////////////////////////////////////////////////////////////
    getFileContents: function(url) {
        let sis = Cc["@mozilla.org/scriptableinputstream;1"]
                  .getService(Ci.nsIScriptableInputStream);

        let channel = Services.io.newChannel(url, null, null);
        let input = channel.open();
        sis.init(input);

        let contents = sis.read(input.available());

        sis.close();
        input.close();

        return contents;
    },


    openPreferencesWindow: function(parent, url, title) {
        let windows = Services.wm.getEnumerator(null);
        while (windows.hasMoreElements()) {
            let window = windows.getNext();
            if (window.document.documentURI == url) {
                window.focus();

                return;
            }
        }

        let features = "chrome,titlebar,toolbar,centerscreen";
        let instantApply = Services.prefs.getBoolPref(
                                          "browser.preferences.instantApply");
        features += instantApply ? ",dialog=no" : ",modal";

        parent.openDialog(url, title, features);
    },


    ///////////////////////////////////////////////////////////////////////////
    log: function(msg) {
        msg = "Simple Locale Switcher: " + msg + ".";

        Services.console.logStringMessage(msg);
    }
};


var tbUtils = {

    /**
     * Open an url as a Content Tab. See:
     * https://developer.mozilla.org/en-US/docs/Thunderbird/Content_Tabs
     *
     * SOURCE: /mail/base/content/utilityOverlay.js
     */
    openContentTab: function(url, handlerRegExp) {
        if (!handlerRegExp) {
            let uri = Services.io.newURI(url, null, null);
            handlerRegExp = "^" + uri.prePath;
        }
        let litRegExp = 'new RegExp("' + handlerRegExp + '")';
        let handler = "specialTabs.siteClickHandler(event, " + litRegExp + ");";
        let tabParams = { contentPage: url, clickHandler: handler };

        let tabmail;
        let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
        if (mail3PaneWindow) {
            tabmail = mail3PaneWindow.document.getElementById("tabmail");
            mail3PaneWindow.focus();
        }
        if (tabmail)
            tabmail.openTab("contentTab", tabParams);
        else
            window.openDialog("chrome://messenger/content/", "_blank",
                              "chrome,dialog=no,all", null,
                              { tabType: "contentTab", tabParams: tabParams });
    }
};
