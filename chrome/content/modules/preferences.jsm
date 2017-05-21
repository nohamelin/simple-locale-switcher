/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["prefs"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");


/*
 * It's assumed throughout this module that a "branch" parameter is always
 * an object that implements the nsIPrefBranch interface.
 */

function getComplexValue(branch, prefName, type) {
    return branch.getComplexValue(prefName, type).data;
}

function setComplexValue(branch, prefName, type, value) {
    let cs = Cc["@mozilla.org/supports-string;1"].createInstance(type);
    cs.data = value;
    branch.setComplexValue(prefName, type, cs);
}


var prefs = {

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

        // SOURCE: about:config source code
        return /^chrome:\/\/.+\/locale\/.+\.properties/.test(value);
    },


    getCharOrLocalizedCharPref: function(branch, prefName) {
        try {
            return this.getLocalizedCharPref(branch, prefName);
        } catch (e) {
            return branch.getCharPref(prefName);
        }
    },


    isDefaultCharPrefLocalized: function(prefName) {
        let branch = Services.prefs.getDefaultBranch("");

        return this.isCharPrefLocalized(branch, prefName);
    }
};
