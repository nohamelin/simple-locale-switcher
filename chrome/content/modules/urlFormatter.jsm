/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["formatURL"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("chrome://simplels/content/modules/general.jsm");


function getPlatformDirectory() {
    // Mozilla's naming convention for the containing folder of
    // platform-specific stuff in its file servers. See, for example:
    //   ftp://ftp.mozilla.org/pub/firefox/releases/latest/
    switch (utils.os) {
        case "winnt":
            return "win32";

        case "darwin":
            return "mac";

        default:
            return "linux-i686";  // TODO: should we care about "linux-x86_64"?
    }
}


/**
 * A extended implementation of the native formatter for urls
 * (nsIURLFormatter): same behaviour, a few new variables are supported;
 * they starts with a double underscore: "__". TODO: Move to a component and
 * to reuse the existent, mentioned interface.
 */
function formatURL(url) {
    url = url.replace(/%__DIR_OS%/g, getPlatformDirectory());

    // Finally, use the built-in formatter
    return Services.urlFormatter.formatURL(url);
}
