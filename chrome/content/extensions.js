/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var simplels = {

    openGetMoreLanguagesPage: function() {
        let prefs = Services.prefs.getBranch("extensions.simplels.");
        let getURL = this.utils.getComplexCharPref(prefs,
                                                   "getMoreLanguagesURL");
        getURL = this.formatURL(getURL);

        switch (this.utils.application) {
            case this.FIREFOX_ID :
                openURL(getURL);
                break;

            case this.THUNDERBIRD_ID :
                this.tbUtils.openContentTab(getURL);
                break;
        }
    }
};


Cu.import("resource://simplels/general.jsm", simplels);
Cu.import("resource://simplels/urlFormatter.jsm", simplels);
