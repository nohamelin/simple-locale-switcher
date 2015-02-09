/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["domUtils"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;


var domUtils = {

    removeChildrenByClassName: function(node, className) {
        if (!node || !className)
            return;

        let children = node.childNodes;

        for (let i = children.length - 1; i >= 0; --i) {
            let child = children[i];
            if (child.classList.contains(className))
                node.removeChild(child);
        }
    }
};
