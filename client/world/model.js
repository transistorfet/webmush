
'use strict';

const m = require('mithril');

const Forms = require('../forms');
const websocket = require('../websocket');


const World = {
    view: { },
    prompt: null,
    connected: false,

    connect: function (vnode) {
        websocket.connect();
        Console.init();
    },

    open: function (event) {
        websocket.send({ type: 'connect' });
    },

    receive: function (msg, ws) {
        World.connected = true;
        console.log("WS MSG IN", msg);
        if (msg.type == 'log') {
            Console.log(msg.text);
        }
        else if (msg.type == 'typing') {
            console.log(msg.id, msg.value ? 'is typing' : 'is not typing');
            if (!World.view || !World.view.location)
                return;
            World.view.location.contents.map(function (obj) {
                if (obj.id == msg.id)
                    obj.typing = msg.value;
            });
        }
        else if (msg.type == 'update') {
            if (msg.player)
                World.view.player = msg.player;
            if (msg.details)
                World.view.details = msg.details;
            if (msg.location) {
                if (World.view.location && World.view.location.id != msg.location.id)
                    window.history.pushState({ id: msg.location.id }, 'previous_location');
                World.view.location = msg.location;
            }
            if (msg.body) {
                World.view.body_diff = {};
                if (World.view.body) {
                    for (let key in msg.body)
                        if (msg.body[key] != World.view.body[key])
                            World.view.body_diff[key] = true;
                }
                World.view.body = msg.body;
            }
        }
        else if (msg.type == 'prompt') {
            // TODO you should check to see if the previous prompt can be dismissed or not
            World.prompt = new Forms.Prompt(msg.id, msg.respond, msg.form, World.sendResponse, World.sendCancel);
        }
        else if (msg.type == 'prompt-update') {
            if (World.prompt && World.prompt.seq == msg.seq) {
                if (msg.errors)
                    World.prompt.errors = msg.errors;
                else if (msg.close)
                    World.prompt = null;
            }
        }
        else
            return;
        m.redraw();
    },

    close: function (event) {
        if (World.connected) {
            Console.log("<status>Disconnected");
            m.redraw();
        }
        World.connected = false;
    },

    processInput: function (text) {
        if (text.indexOf('/') == 0) {
            var [_, cmd, args] = text.trim().match(/^\/(\S*)(?:\s+(.*))?$/);
            if (cmd == 'me')
                websocket.send({ type: 'emote', text: args });
            else
                websocket.send({ type: 'do', verb: cmd, text: args });
        }
        else
            websocket.send({ type: 'say', text: text });
    },

    go: function (direction) {
        //window.history.pushState({ id: World.view.location.id, from: direction }, 'previous_location');
        websocket.send({ type: 'do', verb: 'go', text: direction });
    },

    back: function (e) {
        if (e.state && e.state.id) {
            e.preventDefault();
            websocket.send({ type: 'do', verb: 'go', id: e.state.id });
        }
    },

    look: function (name) {
        websocket.send({ type: 'do', verb: 'look', text: name });
    },

    info: function (text) {
        websocket.send({ type: 'do', verb: 'info', text: text });
    },

    doVerb: function (verb, item) {
        console.log("DO", verb, item);
        websocket.send({ type: 'do', verb: verb, id: item.id });
    },

    editAttr: function (obj, attr, value) {
        if (obj[attr] != value)
            websocket.send({ type: 'edit', id: obj.id, attr: attr, text: value });
    },

    sendResponse: function (prompt, response) {
        websocket.send({ type: 'respond', id: prompt.id, respond: prompt.respond, response: response, seq: prompt.seq });
    },

    sendCancel: function (prompt) {
        websocket.send({ type: 'respond', id: prompt.id, respond: prompt.respond, cancel: true, seq: prompt.seq });
    },

    updateTyping: function (value) {
        websocket.send({ type: 'typing', value: value });
    },
};


const Console = {
    logs: [ ],
    input: '',
    isTiming: null,
    isTyping: false,
    history: [ ],
    history_index: 0,
    //store: window.localStorage,
    //store: window.sessionStorage,

    init() {
        var value = window.localStorage.getItem('logs');
        if (value)
            Console.logs = JSON.parse(value);
    },

    log(text) {
        // TODO you could add support for newline characters in the text string here
        Console.logs.push(text);
        Console.logs = Console.logs.slice(-200);
        window.localStorage.setItem('logs', JSON.stringify(Console.logs));
    },

    setInput(value) {
        Console.input = value;
    },

    typing() {
        if (Console.isTiming)
            clearTimeout(Console.isTiming);

        if (!Console.isTyping) {
            console.log("Typing");
            World.updateTyping(true);
        }
        Console.isTyping = true;

        Console.isTiming = setTimeout(function () {
            Console.isTiming = null;
            Console.isTyping = false;
            console.log("Not Typing");
            World.updateTyping(false);
        }, 3000);
    },

    onInput(value) {
        if (!Console.input)
            return;

        if (Console.input.trim() == '/clear') {
            window.localStorage.clear('logs');
            Console.logs = [ ];
        }
        else
            World.processInput(Console.input);

        Console.history.push(Console.input);
        Console.history_index = Console.history.length;
        Console.input = '';
    },

    historyUp() {
        Console.history_index -= 1;
        if (Console.history_index < 0)
            Console.history_index = 0;
        Console.input = Console.history[Console.history_index];
    },

    historyDown() {
        Console.history_index += 1;
        if (Console.history_index >= Console.history.length) {
            Console.history_index = Console.history.length;
            Console.input = '';
        }
        else {
            Console.input = Console.history[Console.history_index];
        }
    },
};

World.console = Console;


window.addEventListener('popstate', World.back);

websocket.on('open', World.open);
websocket.on('msg', World.receive);
websocket.on('close', World.close);

module.exports = World;

