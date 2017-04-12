
'use strict';

const m = require('mithril');

const Strings = require('../../lib/strings');

const View = require('../views');
const World = require('./model');
const Decorations = require('./decorations');
const Media = require('../media/components');
const { UserInfo } = require('../users');


const WorldArea = {
    oninit: function (vnode) {
        World.connect();
        this.columns = true;
    },

    view: function(vnode) {
        return [
            m('div', { id: "world-chat", class: this.columns ? 'column-view' : '' }, [
                m('div', { id: "world-logs" }, 
                    m(WorldLogs, { logs: World.console.logs })),
                m('div', { id: "world-input-div" },
                    m(WorldInput)),
            ]),
            m('div', { id: "world-area", class: this.columns ? 'column-view' : '' }, [
                m(WorldView, { view: World.view, prompt: World.prompt }),
                m('a', { class: 'column-toggle tinylabel', onclick: function () { this.columns = !this.columns; }.bind(this) }, this.columns ? 'single view' : 'column view'),
            ]),
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
            World.console.onInput();
        else if (e.key == 'ArrowUp')
            World.console.historyUp();
        else if (e.key == 'ArrowDown')
            World.console.historyDown();
    },

    view: function (vnode) {
        return [
            m('input', { id: "world-input", type: "text", oninput: m.withAttr('value', World.console.setInput), onkeydown: this.checkEnter, value: World.console.input }),
            m('button', { type: "button", onclick: World.console.onInput }, "Say"),
        ];
    },
};

const WorldView = {
    view: function (vnode) {
        return [
            m(WorldViewLocation, { location: vnode.attrs.view.location }),
            vnode.attrs.prompt ? m(View.Box, { class: 'prompt-info slide-down' }, vnode.attrs.prompt.render()) : '',
            vnode.attrs.view.details ? m(WorldViewDetails, { details: vnode.attrs.view.details }) : '',
            m(WorldViewPlayer, { player: vnode.attrs.view.player, body: vnode.attrs.view.body, body_template: vnode.attrs.view.body_template }),
        ];
    },
};

const WorldViewLocation = {
    view: function (vnode) {
        if (!vnode.attrs.location)
            return m(View.Box, { class: 'location' }, "You don't seem to be... anywhere");

        let style = World.view.location.style;
        return m(Decorations.Styled, { style: style }, [
            m(View.Box, { class: 'location' + ( style ? ' styled' : '' ) }, [
                m('span', { class: 'tinylabel' }, "You are in"),
                m(ObjectAttribute, { class: 'title', obj: vnode.attrs.location, attr: 'title' }),
                m(ObjectAttribute, { class: 'description', obj: vnode.attrs.location, attr: 'description' }),
                m('div', { class: 'tinylabel' }, m(WorldVerbList, { item: vnode.attrs.location })),
                vnode.attrs.location.audio ? m('audio', { src: vnode.attrs.location.audio, controls: true, loop: vnode.attrs.location.audio_loop, autoplay: UserInfo.prefs.autoplay, style: 'float: right; width: 120px;' }) : '',
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
            ]),
        ]);
    },
};

const WorldViewPlayer = {
    view: function (vnode) {
        if (!vnode.attrs.player)
            return [];

        return (
            m(View.Box, { class: 'player' }, [
                m('span', { class: 'tinylabel' }, "You are"),
                m(ObjectAttribute, { class: 'title', obj: vnode.attrs.player, attr: 'title' }),
                m(ObjectAttribute, { class: 'description', obj: vnode.attrs.player, attr: 'description' }),
                m('div', { class: 'tinylabel' }, m(WorldVerbList, { item: vnode.attrs.player })),
                m('span', { class: 'tinylabel' }, "You are carrying"),
                m(WorldViewContents, { contents: vnode.attrs.player.contents }),
                //m('span', { class: 'tinylabel' }, "Your status is"),
                m(WorldViewPlayerBody, { body: vnode.attrs.body, body_template: vnode.attrs.body_template }),
            ])
        );
    },
};

const WorldViewPlayerBody = {
    view: function (vnode) {
        if (!vnode.attrs.body)
            return [];

        return (
            m(View.Box, { class: 'body', borderless: true }, [
                m('span', { class: 'tinylabel' }, "You're status is"),
                vnode.attrs.body_template ? vnode.attrs.body_template(vnode.attrs.body) : '(template missing)',
            ])
        );
    },
};

const WorldViewDetails = {
    view: function (vnode) {
        if (!vnode.attrs.details)
            return [];

        return m(View.Box, { class: 'details' }, [
            m('span', { class: 'tinylabel', onclick: () => { World.view.details = null; } }, "You are looking at"),
            m(ObjectAttribute, { class: 'title', obj: vnode.attrs.details, attr: 'title' }),
            m(ObjectAttribute, { class: 'description', obj: vnode.attrs.details, attr: 'description' }),
            vnode.attrs.details.contents
                ? [
                    m('span', { class: 'tinylabel' }, "Inside are"),
                    m(WorldViewContents, { contents: vnode.attrs.details.contents }),
                ]
                : '',
        ]);
    },
};

const WorldViewContents = {
    view: function (vnode) {
        return m('table', { class: 'contents' }, vnode.attrs.contents.map(function (item) {
            return m('tr', [
                m('td', Media.SmallIcon.call(this, item.icon)),
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
            let parts = verb.split(/[\/|]/, 1);
            verbs.push(m('a', { onclick: World.doVerb.bind(World, parts[0], vnode.attrs.item) }, parts[0]));
            verbs.push(", ");
        });
        verbs.pop();
        verbs.push(")");
        return verbs;
    },
};

const ObjectAttribute = {
    view: function (vnode) {
        if (vnode.attrs.obj.editable && vnode.attrs.obj.editable.find((attr) => { return attr.split('|')[0] == vnode.attrs.attr; }))
            return m(View.EditableField, Object.assign({ ondone: (value) => { World.editAttr(vnode.attrs.obj, vnode.attrs.attr, value); } }, vnode.attrs), vnode.attrs.obj[vnode.attrs.attr]);
        else
            return m('div', vnode.attrs, vnode.attrs.obj[vnode.attrs.attr]);
    },
};

module.exports = WorldArea;
 
