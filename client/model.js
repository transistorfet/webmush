
'use strict';

const m = require('mithril');
const websocket = require('./websocket');

const World = {
    logs: [ ],
    view: { },
    input: '',
    history: [ ],
    history_index: 0,
    connected: false,

    connect: function (vnode) {
        websocket.connect();

        let value = window.sessionStorage.getItem('logs');
        if (value)
            World.logs = JSON.parse(value);
    },

    receive: function (ws, msg) {
        World.connected = true;
        console.log("WS MSG IN", msg);
        if (msg.type == 'log') {
            World.log(msg.text);
        }
        else if (msg.type == 'update') {
            if (msg.player)
                World.view.player = msg.player;
            if (msg.location)
                World.view.location = msg.location;
            if (msg.details)
                World.view.details = msg.details;
        }
        else
            return;
        m.redraw();
    },

    close: function (msg) {
        if (World.connected) {
            World.log("<status>Disconnected");
            m.redraw();
        }
        World.connected = false;
    },

    log(text) {
        World.logs.push(text);
        World.logs = World.logs.slice(-200);
        window.sessionStorage.setItem('logs', JSON.stringify(World.logs));
    },

    setInput: function (value) {
        World.input = value;
    },

    historyUp: function () {
        World.history_index -= 1;
        if (World.history_index < 0)
            World.history_index = 0;
        World.input = World.history[World.history_index];
    },

    historyDown: function () {
        World.history_index += 1;
        if (World.history_index >= World.history.length) {
            World.history_index = World.history.length;
            World.input = '';
        }
        else {
            World.input = World.history[World.history_index];
        }
    },

    processInput: function () {
        if (!World.input)
            return;

        if (World.input.indexOf('/') == 0) {
            let [_, cmd, text] = World.input.trim().match(/^\/(\S*)(?:\s+(.*))?$/);
            if (cmd == 'clear') {
                window.sessionStorage.clear('logs');
                World.logs = [ ];
            }
            else if (cmd == 'me')
                websocket.send({ type: 'emote', text: text });
            else if (cmd == 'help')
                websocket.send({ type: 'help', text: text });
            else
                websocket.send({ type: 'do', verb: cmd, text: text });
        }
        else
            websocket.send({ type: 'say', text: World.input });

        World.history.push(World.input);
        World.history_index = World.history.length;
        World.input = '';
    },

    go: function (direction) {
        websocket.send({ type: 'go', text: direction });
    },

    look: function (name) {
        websocket.send({ type: 'do', verb: 'look', text: name });
    },

    doVerb: function (verb, item) {
        console.log("DO", verb, item);
        websocket.send({ type: 'do', verb: verb, id: item.id });
    },

    editAttr: function (id, attr, value) {
        websocket.send({ type: 'edit', id: id, attr: attr, text: value });
    },
};

websocket.use(World.receive);
websocket.notifyClose(World.close);

module.exports = World;

