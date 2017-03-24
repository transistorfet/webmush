
'use strict';

const m = require('mithril');

const websocket = require('../websocket');

const UserInfo = {
    prefs: { },

    open: function (event) {
        if (Object.keys(UserInfo.prefs).length === 0)
            websocket.send({ type: 'get', section: 'prefs' });
    },

    receive: function (msg) {
        if (msg.type == 'prefs') {
            UserInfo.prefs = msg.prefs;
        }
        else
            return;
        m.redraw();
    },
};

websocket.on('open', UserInfo.open);
websocket.on('msg', UserInfo.receive);

module.exports = UserInfo;

