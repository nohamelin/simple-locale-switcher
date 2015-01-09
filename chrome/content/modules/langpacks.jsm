/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = [
    "getMoreLanguagesURL",
    "learnMoreAboutLanguagesURL"
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://simplels/content/modules/general.jsm");
Cu.import("chrome://simplels/content/modules/preferences.jsm");
Cu.import("chrome://simplels/content/modules/urlFormatter.jsm");


const ADDON_BRANCH_NAME = "extensions.simplels.";
const FTP_GET_MORE_FILE = "chrome://simplels/content/get-ftp-langpacks.json";
const AMO_FALLBACK_GET_MORE_URL = "https://addons.mozilla.org/language-tools/";

XPCOMUtils.defineLazyGetter(this, "addonBranch", function() {
    return Services.prefs.getBranch(ADDON_BRANCH_NAME);
});

XPCOMUtils.defineLazyGetter(this, "ftpURL", function() {
    let getString = utils.getFileContents(FTP_GET_MORE_FILE);
    let getObject = JSON.parse(getString);

    let url;
    let getApplicationObject = getObject[utils.application];
    if (getApplicationObject)
        url = getApplicationObject[utils.channel];

    return url ||
           getObject["fallback"][utils.application] ||
           getObject["fallback-all"];
});


function getMoreLanguagesURL() {
    let destinationType = addonBranch.getIntPref("getMoreLanguages");
    let getURL;

    switch (destinationType) {
        case 0 :    // Get the url from our related preference
            try {
                getURL = prefs.getComplexCharPref(addonBranch,
                                                  "getMoreLanguagesURL");
            } catch (e) {}
            break;

        case 1 :    // Get from AMO
            getURL = AMO_FALLBACK_GET_MORE_URL;
            break;

        case 2 :    // Get a suitable url to the Mozilla's file servers
            getURL = ftpURL;
            break;
    }

    return formatURL(getURL || AMO_FALLBACK_GET_MORE_URL);
}


function learnMoreAboutLanguagesURL() {
    let learnURL = prefs.getComplexCharPref(addonBranch,
                                            "learnMoreAboutLanguagesURL");
    return formatURL(learnURL);
}
