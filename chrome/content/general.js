/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var simplels = {

    inContentPrefs: null,


    handleEvent: function(event) {
        switch (event.type) {
            case "load" :
                window.removeEventListener("load", simplels);
                this.onLoad();
                break;
        }
    },


    onLoad: function() {
        this.inContentPrefs = document.documentURI.toLowerCase()
                                        .indexOf("about:preferences") == 0;
    },


    openLanguagesDialog: function() {
        // about:preferences can't manage well sub-dialogs (prefwindows with
        // a "type" attribute with a "child" value). See:
        //   https://bugzilla.mozilla.org/show_bug.cgi?id=738797#c3
        let langsURL;

        if (this.inContentPrefs) {
            Cu.import("chrome://simplels/content/modules/general.jsm", this);

            langsURL = "chrome://simplels/content/languages-outer.xul";
            this.utils.openPreferencesWindow(window, langsURL);
        }
        else {
            langsURL = "chrome://simplels/content/languages-outer-c.xul";
            document.documentElement.openSubDialog(langsURL, "", null);
        }
    }
};


window.addEventListener("load", simplels);
