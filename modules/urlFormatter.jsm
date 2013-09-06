/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = [ "formatURL" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://simplels/general.jsm");


/**
 * A extended implementation of the native formatter for urls
 * (nsIURLFormatter): same behaviour, a few new variables are supported;
 * they starts with a double underscore: "__". TODO: Move to a component and
 * to reuse the existent, mentioned interface.
 *
 * %__DIR_OS% - Platform's directory in Mozilla's ftp site
 */
function formatURL(url) {
    let DIR_OS = { winnt : "win32", darwin : "mac", linux : "linux-i686" };

    url = url.replace(/%__DIR_OS%/g, DIR_OS[utils.os]);


    // Finally, use the built-in formatter
    return Services.urlFormatter.formatURL(url);
}
