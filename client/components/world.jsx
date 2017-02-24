
'use strict';

const m = require('mithril');

const websocket = require('../websocket');


const World = {
    logs: [ ],
    view: { },
    input: '',

    connect: function (vnode) {
        websocket.connect();

        let value = window.localStorage.getItem('logs');
        console.log(value);
        if (value)
            World.logs = JSON.parse(value);
    },

    receive: function (ws, msg) {
        console.log("WS MSG IN", msg);
        if (msg.type == 'log') {
            World.logs.push(msg.text);
            window.localStorage.setItem('logs', JSON.stringify(World.logs));
        }
        else if (msg.type == 'update') {
            if (msg.player)
                World.view.player = msg.player;
            if (msg.location)
                World.view.location = msg.location;
        }
        else
            return;
        m.redraw();
    },

    setInput: function (value) {
        World.input = value;
    },

    send: function () {
        console.log('send', World.input);
        if (World.input) {
            websocket.send({ type: 'input', text: World.input });
            this.input = '';
        }
    },

    go: function (direction) {
        console.log("GO", arguments);
        websocket.send({ type: 'go', text: direction });
    }

};

websocket.use(World.receive);


const WorldArea = {
    oninit: function (vnode) {
        World.connect();
    },

    view: function(vnode) {
        return [
            m('div', { id: "world-chat" }, [
                m('div', { id: "world-logs" }, 
                    m(WorldLogs, { logs: World.logs })),
                m('div', { id: "world-input-div" },
                    m(WorldInput)),
            ]),
            m('div', { id: "world-area" },
                m(WorldView, { view: World.view })),
        ];
    },
};

const WorldLogs = {
    view: function (vnode) {
        return vnode.attrs.logs.map(function (line) {
            return m('li', line);
        });
    },
};

const WorldInput = {
    checkEnter: function (e) {
        if (e.key == "Enter")
            World.send();
    },

    view: function (vnode) {
        return [
            m('input', { id: "world-input", type: "text", oninput: m.withAttr('value', World.setInput), onkeydown: this.checkEnter, value: World.input }),
            m('button', { type: "button", onclick: World.send }, "Say"),
        ];
    },
};

const WorldView = {
    view: function (vnode) {
        if (!vnode.attrs.view.location)
            return m('div', { class: 'location-info viewbox' }, "You don't seem to be... anywhere");

        return [
            m('div', { class: 'location-info viewbox' }, [
                m('div', { class: 'title' }, vnode.attrs.view.location.title),
                m('div', { class: 'description' }, vnode.attrs.view.location.description),
                m('table', { class: 'exits' }, vnode.attrs.view.location.exits.map(function (exit) {
                    return m('tr', [
                        m('td', m('a', { href: "#", onclick: World.go.bind(World, exit[0]) }, exit[0])),
                        m('td', exit[1]),
                    ]);
                })),
                m('table', { class: 'contents' }, vnode.attrs.view.location.contents.map(function (item) {
                    return m('tr', [
                        //m('td', m('a', { href: "#", onclick: World.go.bind(World, exit[0]) }, exit[0])),
                        m('td', item),
                    ]);
                })),
            ]),
            m('div', { class: 'player-info viewbox' }, [
                m('div', { class: 'title' }, "You are " + vnode.attrs.view.player.title),
                m('div', { class: 'description' }, vnode.attrs.view.player.description),
                m('span', { class: 'tinylabel' }, "Inventory:"),
                m('table', { class: 'contents' }, vnode.attrs.view.player.contents.map(function (item) {
                    return m('tr', [
                        //m('td', m('a', { href: "#", onclick: World.go.bind(World, exit[0]) }, exit[0])),
                        m('td', item),
                    ]);
                })),
            ]),
        ];
    },
};


module.exports = WorldArea;
 
