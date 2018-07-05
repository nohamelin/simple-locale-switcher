/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = [
    "THUNDERBIRD_ID",
    "SEAMONKEY_ID",
    "utils",
    "tbUtils"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "UpdateUtils",
            "resource://gre/modules/UpdateUtils.jsm");


const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
const SEAMONKEY_ID = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";


var utils = {

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
            // The given argument let us to ignore the possible partnership
            // bits from the channel string.
            this._channel = UpdateUtils.getUpdateChannel(false);
        }
        return this._channel;
    },


    getAddonFileContents: function(spec) {
        let sis = Cc["@mozilla.org/scriptableinputstream;1"]
                  .getService(Ci.nsIScriptableInputStream);

        let uri = Services.io.newURI(spec, null, null);
        let channel = Services.io.newChannelFromURI2(
                        uri,
                        null,
                        Services.scriptSecurityManager.getSystemPrincipal(),
                        null,
                        Ci.nsILoadInfo.SEC_NORMAL,
                        Ci.nsIContentPolicy.TYPE_OTHER);

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
            if (window.document.documentURI === url) {
                window.focus();

                return;
            }
        }

        let features = "chrome,titlebar,toolbar,centerscreen";
        let instantApply = Services.prefs.getBoolPref(
                                          "browser.preferences.instantApply");
        features += instantApply ? ",dialog=no" : ",modal";

        parent.openDialog(url, title, features);
    }
};


var tbUtils = {

    /*
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
        let tabParams = {contentPage: url, clickHandler: handler};

        let tabmail;
        let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
        if (mail3PaneWindow) {
            tabmail = mail3PaneWindow.document.getElementById("tabmail");
            mail3PaneWindow.focus();
        }
        if (tabmail) {
            tabmail.openTab("contentTab", tabParams);
        } else {
            window.openDialog("chrome://messenger/content/",
                              "_blank",
                              "chrome,dialog=no,all",
                              null,
                              {tabType: "contentTab", tabParams: tabParams});
        }
    }
};
