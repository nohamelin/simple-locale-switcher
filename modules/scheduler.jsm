/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = [ "scheduler" ];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;


var waiting = Object.create(null);  // No inherited keys
                                    // COMPAT TODO: Use Map() (Gecko 13+)

var scheduler = {
    // A simple alternative to setTimeout()

    queue: function(id, callback, delay) {
        waiting[id] = waiting[id] ||
                      Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

        waiting[id].initWithCallback({
            notify: function(timer) {
                delete waiting[id];
                callback.apply(null);
            }
        }, delay, Ci.nsITimer.TYPE_ONE_SHOT);
    },


    cancel: function(id) {
        if (waiting[id]) {
            waiting[id].cancel();
            delete waiting[id];
        }
    }
};
