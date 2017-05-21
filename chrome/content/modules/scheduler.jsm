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


var waiting = new Map();

/*
 * It does basically the same as the first version of the DeferredTask.jsm
 * module (available since Gecko 18, and rewritten for Gecko 28):
 * It allows to run a task after a delay; multiple attempts to run the same
 * task before the delay will be coalesced.
 */
var scheduler = {

    queue: function(id, callback, delay) {
        if (!waiting.has(id)) {
            waiting.set(id, Cc["@mozilla.org/timer;1"]
                            .createInstance(Ci.nsITimer));
        }

        waiting.get(id).initWithCallback({
            notify: function(timer) {
                waiting.delete(id);
                callback.apply(null);
            }
        }, delay, Ci.nsITimer.TYPE_ONE_SHOT);
    },


    cancel: function(id) {
        if (waiting.has(id)) {
            waiting.get(id).cancel();
            waiting.delete(id);
        }
    }
};
