/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;


var simplels = {

    getMoreLanguagesPref: null,

    customBcstr: null,
    customListItem: null,


    onLoad: function() {
        this.getMoreLanguagesPref = document.getElementById("getMoreLanguages");

        this.customBcstr = document.getElementById("customDestination");
        this.customListItem = document.getElementById(
                                            "custom-destination-list-item");

        this.onChangeGetMorePreference();
    },


    onChangeGetMorePreference: function() {
        if (this.getMoreLanguagesPref.value !== this.customListItem.value)
            this.customBcstr.setAttribute("disabled", "true");
        else
            this.customBcstr.removeAttribute("disabled");
    }
};
