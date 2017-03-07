
'use strict';

const m = require('mithril');

const Welcome = {
    view: function() {
        return m('a', { href: "/test" }, "Linky Things");
    },
};

module.exports = Welcome;
 
