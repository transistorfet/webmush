
'use strict';

const m = require('mithril');

const websocket = require('../websocket');
const UserInfo = require('../user/model');


const World = {
    logs: [ ],
    view: { },
    prompt: null,
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

    open: function (event) {
        websocket.send({ type: 'connect' });
    },

    receive: function (msg, ws) {
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
        else if (msg.type == 'prompt') {
            // TODO you should check to see if the previous prompt can be dismissed or not
            //World.prompt = msg.prompt;
            World.prompt = new Prompt(msg.id, msg.respond, msg.form);
        }
        else if (msg.type == 'prompt-errors') {
            World.prompt.errors = msg.errors;
        }
        else if (msg.type == 'prefs') {
            UserInfo.prefs = msg.prefs;
        }
        else
            return;
        m.redraw();
    },

    close: function (event) {
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
        window.history.pushState({ id: World.view.location.id, from: direction }, 'previous_location');
        websocket.send({ type: 'go', text: direction });
    },

    back: function (e) {
        if (e.state && e.state.id) {
            e.preventDefault();
            websocket.send({ type: 'go', id: e.state.id });
        }
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

    sendResponse: function (prompt, response) {
        websocket.send({ type: 'respond', id: prompt.id, respond: prompt.respond, response: response });
    },
};

class Prompt {
    constructor(id, respond, form, onsubmit, oncancel) {
        this.id = id;
        this.respond = respond;
        this.form = form;
        this.response = { };
        this.errors = null;
        this.onsubmit = onsubmit;
        this.oncancel = oncancel;
    }

    setItem(name, value) {
        this.response[name] = value;
    }

    getForm(name) {
        return this.subforms[name];
    }

    setForm(name, formdata) {
        this.subforms[name] = formdata;
    }

    submit() {
        if (this.onsubmit)
            this.onsubmit(this.response);
    }

    cancel() {
        if (this.oncancel)
            this.oncancel();
    }
};


window.addEventListener('popstate', World.back);

websocket.on('open', World.open);
websocket.on('msg', World.receive);
websocket.on('close', World.close);

module.exports = World;

