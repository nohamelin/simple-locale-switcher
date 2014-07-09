/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var simplels = {

    handleEvent: function(event) {
        switch (event.type) {
            case "load" :
                window.removeEventListener("load", simplels);
                this.onLoad();
                break;
        }
    },


    onLoad: function() {
        if (document.documentURI == "about:preferences") {
            let langsBox = document.getElementById("simplels-languages-group");
            let anotherBox = document.getElementById("startupGroup");

            // The default visibility for the groupboxes of the General pane
            // changed with the landing of:
            //   https://bugzilla.mozilla.org/show_bug.cgi?id=754344
            langsBox.hidden = anotherBox.hidden;
        }
    },


    openLanguagesDialog: function() {
        // about:preferences (and any other in-content chrome page, probably)
        // doesn't manage very well sub-dialogs. See:
        //   https://bugzilla.mozilla.org/show_bug.cgi?id=738797#c3
        if (document.documentURI == "about:preferences") {
            Cu.import("chrome://simplels/content/modules/general.jsm", this);

            let langsURL = "chrome://simplels/content/languages-outer.xul";
            this.utils.openPreferencesWindow(window, langsURL);
        }
        else {
            let langsURL = "chrome://simplels/content/languages-outer-c.xul";
            document.documentElement.openSubDialog(langsURL, "", null);
        }
    }
};


window.addEventListener("load", simplels);
