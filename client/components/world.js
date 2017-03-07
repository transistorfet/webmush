
'use strict';

const m = require('mithril');
const parseDecorations = require('./decorations');

const World = require('../model');


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
    onupdate: function (vnode) {
        let logs = document.getElementById('world-logs');
        if (logs.scrollTop != logs.scrollHeight)
            logs.scrollTop = logs.scrollHeight;
    },

    view: function (vnode) {
        return vnode.attrs.logs.map(function (line) {
            return m('li', parseDecorations(line));
        });
    },
};

const WorldInput = {
    checkEnter: function (e) {
        if (e.key == 'Enter')
            World.processInput();
        else if (e.key == 'ArrowUp')
            World.historyUp();
        else if (e.key == 'ArrowDown')
            World.historyDown();
    },

    view: function (vnode) {
        return [
            m('input', { id: "world-input", type: "text", oninput: m.withAttr('value', World.setInput), onkeydown: this.checkEnter, value: World.input }),
            m('button', { type: "button", onclick: World.processInput }, "Say"),
        ];
    },
};

const ViewBox = {
    expand: true,
    view: function (vnode) {
        if (!vnode.state.expand) {
            return m('div[class=viewbox]', vnode.attrs, [
                m('a', { class: 'viewbox-expand', href: '#', onclick: () => { vnode.state.expand = true; } }, 'more'),
                vnode.children.slice(0, 2),
            ]);
        }
        else {
            return m('div[class=viewbox]', vnode.attrs, [
                m('a', { class: 'viewbox-expand', href: '#', onclick: () => { vnode.state.expand = false; } }, 'less')
            ].concat(vnode.children));
        }
    },
}

const EditableField = {
    value: '',
    editing: false,

    onupdate: function (vnode) {
        vnode.dom.focus();
    },

    startEdit: function () {
        this.editing = true;
        this.value = '';
    },

    endEdit: function (obj, attr, value) {
        this.editing = false;
        if (obj[attr] != value) {
            console.log("NEW", this, arguments);
            World.editAttr(obj.id, attr, value);
        }
        else
            console.log("no change");
    },

    setValue: function (value) {
        this.value = value;
    },

    keyDown: function (e) {
        if (e.key == "Escape")
            this.editing = false;
    },

    view: function (vnode) {
        if (vnode.state.editing)
            return m('textarea', Object.assign({
                oninput: m.withAttr('value', this.setValue.bind(this)),
                onblur: m.withAttr('value', this.endEdit.bind(this, vnode.attrs.obj, vnode.attrs.attr)),
                onkeydown: this.keyDown.bind(this),
            }, vnode.attrs), this.value || vnode.children);
        else
            return m('div', Object.assign({ onclick: this.startEdit.bind(this) }, vnode.attrs), vnode.children);
    },
};

const Field = {
    view: function (vnode) {
        if (vnode.attrs.obj.editable.indexOf(vnode.attrs.attr) == -1)
            return m('div', vnode.attrs, vnode.attrs.obj[vnode.attrs.attr]);
        else
            return m(EditableField, vnode.attrs, vnode.attrs.obj[vnode.attrs.attr]);
    },
};

const WorldView = {
    view: function (vnode) {
        return [
            m(WorldViewLocation, { location: vnode.attrs.view.location }),
            vnode.attrs.view.details ? m(WorldViewDetails, { details: vnode.attrs.view.details }) : '',
            m(WorldViewPlayer, { player: vnode.attrs.view.player }),
        ];
    },
};

const WorldViewLocation = {
    view: function (vnode) {
        if (!vnode.attrs.location)
            return m(ViewBox, { class: 'location-info' }, "You don't seem to be... anywhere");

        return m(ViewBox, { class: 'location-info' }, [
            m('span', { class: 'tinylabel' }, "You are in"),
            m(Field, { class: 'title', obj: vnode.attrs.location, attr: 'title' }),
            m(Field, { class: 'description', obj: vnode.attrs.location, attr: 'description' }),
            m('div', { class: 'tinylabel' }, m(WorldVerbList, { item: vnode.attrs.location })),
            m('span', { class: 'tinylabel' }, "Exits"),
            m('table', { class: 'exits' }, vnode.attrs.location.exits.map(function (exit) {
                return m('tr', [
                    m('td', m('a', { href: "#", onclick: World.go.bind(World, exit.name) }, exit.name)),
                    m('td', exit.title),
                    m('td', { class: 'tinylabel' }, m(WorldVerbList, { item: exit })),
                ]);
            })),
            m('span', { class: 'tinylabel' }, "Also here are"),
            m('table', { class: 'contents' }, vnode.attrs.location.contents.map(function (item) {
                return m('tr', [
                    m('td', m('a', { href: "#", onclick: World.look.bind(World, item.name) }, item.pose ? item.pose : item.title)),
                    m('td', { class: 'tinylabel' }, m(WorldVerbList, { item: item })),
                ]);
            })),
        ]);
    },
};

const WorldViewPlayer = {
    view: function (vnode) {
        if (!vnode.attrs.player)
            return [];

        return m(ViewBox, { class: 'player-info' }, [
            m('span', { class: 'tinylabel' }, "You are"),
            m(Field, { class: 'title', obj: vnode.attrs.player, attr: 'title' }),
            m(Field, { class: 'description', obj: vnode.attrs.player, attr: 'description' }),
            m('div', { class: 'tinylabel' }, m(WorldVerbList, { item: vnode.attrs.player })),
            m('span', { class: 'tinylabel' }, "You are carrying"),
            m('table', { class: 'contents' }, vnode.attrs.player.contents.map(function (item) {
                return m('tr', [
                    m('td', m('a', { href: "#", onclick: World.look.bind(World, item.name) }, item.title)),
                    m('td', { class: 'tinylabel' }, m(WorldVerbList, { item: item })),
                ]);
            })),
        ]);
    },
};

const WorldViewDetails = {
    view: function (vnode) {
        if (!vnode.attrs.details)
            return [];

        return m(ViewBox, { class: 'details-info', /* onclick: function() { World.view.details = null; } */ }, [
            m('span', { class: 'tinylabel' }, "You are looking at"),
            m(Field, { class: 'title', obj: vnode.attrs.details, attr: 'title' }),
            m(Field, { class: 'description', obj: vnode.attrs.details, attr: 'description' }),
        ]);
    },
};

const WorldVerbList = {
    view: function (vnode) {
        if (vnode.attrs.item.verbs.length <= 0)
            return [];

        let verbs = [ ];
        verbs.push("(");
        vnode.attrs.item.verbs.forEach(function (verb) {
            let parts = verb.split('|');
            verbs.push(m('a', { href: "#", onclick: World.doVerb.bind(World, parts[0], vnode.attrs.item) }, parts[0]));
            verbs.push(", ");
        });
        verbs.pop();
        verbs.push(")");
        return verbs;
    },
};

module.exports = WorldArea;
 
