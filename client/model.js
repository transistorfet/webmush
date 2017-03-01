
'use strict';

const m = require('mithril');
const websocket = require('./websocket');

const World = {
    logs: [ ],
    view: { },
    input: '',

    connect: function (vnode) {
        websocket.connect();

        let value = window.sessionStorage.getItem('logs');
        if (value)
            World.logs = JSON.parse(value);
    },

    receive: function (ws, msg) {
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

    log(text) {
        World.logs.push(text);
        World.logs = World.logs.slice(-200);
        window.sessionStorage.setItem('logs', JSON.stringify(World.logs));
    },

    setInput: function (value) {
        World.input = value;
    },

    processInput: function () {
        if (!World.input)
            return;

        if (World.input.indexOf('/') == 0) {
            let [_, cmd, text] = World.input.match(/^\/(\S*)(?:\s+(.*))?$/);
            if (cmd == 'me')
                websocket.send({ type: 'emote', text: text });
            else if (cmd == 'clear') {
                window.sessionStorage.clear('logs');
                World.logs = [ ];
            }
            else if (cmd == 'help') {
                websocket.send({ type: 'help', text: text });
            }
            else {
                websocket.send({ type: 'do', verb: cmd, text: text });
            }
        }
        else
            websocket.send({ type: 'say', text: World.input });
        World.input = '';
    },

    go: function (direction) {
        console.log("GO", arguments);
        websocket.send({ type: 'go', text: direction });
    },

    look: function (name) {
        websocket.send({ type: 'look', text: name });
    },

    doVerb: function (verb, item) {
        console.log("DO", verb, item);
        websocket.send({ type: 'do', verb: verb, id: item.id });
    },

    editAttr: function (attr, value) {
        websocket.send({ type: 'edit', text: value, attr: attr });
    },
};

websocket.use(World.receive);

module.exports = World;

