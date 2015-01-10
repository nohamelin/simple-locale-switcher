/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["scheduler"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;


var waiting = Object.create(null);  // No inherited keys
                                    // COMPAT TODO: Use Map() (Gecko 13+)

/*
 * It does basically the same as the first version of the DeferredTask.jsm
 * module (available since Gecko 18, and rewritten for Gecko 28):
 * It allows to run a task after a delay; multiple attempts to run the same
 * task before the delay will be coalesced.
 */
var scheduler = {

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
