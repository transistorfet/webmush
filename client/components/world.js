
'use strict';

const m = require('mithril');
const Decorations = require('./decorations');
const View = require('./views');

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
            return m('li', Decorations.parse(line));
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
            return m(View.Box, { class: 'location-info' }, "You don't seem to be... anywhere");

        let style = vnode.attrs.location.style ? ( typeof vnode.attrs.location.style == 'string' ? { box: vnode.attrs.location.style } : vnode.attrs.location.style ) : { };

        return m(View.Box, { class: 'location-info', style: style.box ? style.box : '' }, [
            m('span', { class: 'tinylabel' }, "You are in"),
            m(View.Field, { class: 'title', obj: vnode.attrs.location, attr: 'title', style: style.title ? style.title : '' }),
            m(View.Field, { class: 'description', obj: vnode.attrs.location, attr: 'description', style: style.description ? style.description : '' }),
            m('div', { class: 'tinylabel' }, m(WorldVerbList, { item: vnode.attrs.location })),
            m('span', { class: 'tinylabel' }, "Exits"),
            m('table', { class: 'exits' }, vnode.attrs.location.exits.map(function (exit) {
                return m('tr', [
                    m('td', m('a', { onclick: World.go.bind(World, exit.name) }, exit.name)),
                    m('td', exit.title),
                    m('td', { class: 'tinylabel' }, m(WorldVerbList, { item: exit })),
                ]);
            })),
            m('span', { class: 'tinylabel' }, "Also here are"),
            m(WorldViewContents, { contents: vnode.attrs.location.contents }),
        ]);
    },
};

const WorldViewPlayer = {
    view: function (vnode) {
        if (!vnode.attrs.player)
            return [];

        return m(View.Box, { class: 'player-info' }, [
            m('span', { class: 'tinylabel' }, "You are"),
            m(View.Field, { class: 'title', obj: vnode.attrs.player, attr: 'title' }),
            m(View.Field, { class: 'description', obj: vnode.attrs.player, attr: 'description' }),
            m('div', { class: 'tinylabel' }, m(WorldVerbList, { item: vnode.attrs.player })),
            m('span', { class: 'tinylabel' }, "You are carrying"),
            m(WorldViewContents, { contents: vnode.attrs.player.contents }),
        ]);
    },
};

const WorldViewDetails = {
    view: function (vnode) {
        if (!vnode.attrs.details)
            return [];

        return m(View.Box, { class: 'details-info' }, [
            m('span', { class: 'tinylabel', onclick: () => { World.view.details = null; } }, "You are looking at"),
            m(View.Field, { class: 'title', obj: vnode.attrs.details, attr: 'title' }),
            m(View.Field, { class: 'description', obj: vnode.attrs.details, attr: 'description' }),
        ]);
    },
};

const WorldViewContents = {
    view: function (vnode) {
        return m('table', { class: 'contents' }, vnode.attrs.contents.map(function (item) {
            return m('tr', [
                // TODO icons???
                m('td', m('span', { class: 'small-icon', style: item.icon ? item.icon : '' })),
                m('td', m('a', { onclick: World.look.bind(World, item.name) }, item.brief ? item.brief : item.title)),
                m('td', { class: 'tinylabel' }, m(WorldVerbList, { item: item })),
            ]);
        }));
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
            verbs.push(m('a', { onclick: World.doVerb.bind(World, parts[0], vnode.attrs.item) }, parts[0]));
            verbs.push(", ");
        });
        verbs.pop();
        verbs.push(")");
        return verbs;
    },
};

module.exports = WorldArea;
 
