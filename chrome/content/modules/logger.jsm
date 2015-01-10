/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["logger"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;


Cu.import("resource://gre/modules/Services.jsm");

const MSG_PREFIX = "Simple Locale Switcher: ";


var logger = {

    warning: function(msg) {
        let scriptError = Cc["@mozilla.org/scripterror;1"]
                            .createInstance(Ci.nsIScriptError);
        scriptError.init(MSG_PREFIX + msg,
                         null,
                         null,
                         0,
                         0,
                         Ci.nsIScriptError.warningFlag,
                         "chrome javascript");

        Services.console.logMessage(scriptError);
    },


    info: function(msg) {
        Services.console.logStringMessage(MSG_PREFIX + msg);
    }
};
