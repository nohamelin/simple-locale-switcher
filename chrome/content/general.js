/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var simplels = {

    openLanguagesDialog: function() {
        let languagesUrl = "chrome://simplels/content/languages.xul";

        let windows = Services.wm.getEnumerator(null);
        while (windows.hasMoreElements()) {
            let win = windows.getNext();
            if (win.document.documentURI == languagesUrl) {
                win.focus();

                return;
            }
        }

        // The dialog will be always modal because of its "child" type
        let features = "chrome,titlebar,toolbar,centerscreen";
        window.openDialog(languagesUrl, null, features);
    }
};