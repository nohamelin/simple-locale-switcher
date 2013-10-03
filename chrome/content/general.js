/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;


var simplels = {

    openLanguagesDialog: function() {
        // about:preferences (and any other in-content chrome page, probably)
        // doesn't manage very well sub-dialogs. See:
        //   https://bugzilla.mozilla.org/show_bug.cgi?id=738797#c3
        if (document.documentURI == "about:preferences") {
            Cu.import("resource://simplels/general.jsm", this);

            let langsURL = "chrome://simplels/content/languages-outer.xul";
            this.utils.openPreferencesWindow(window, langsURL);
        }
        else {
            let langsURL = "chrome://simplels/content/languages-outer-c.xul";
            document.documentElement.openSubDialog(langsURL, "", null);
        }
    }
};
