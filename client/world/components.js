
'use strict';

const m = require('mithril');

const World = require('./model');
const View = require('./views');
const Decorations = require('./decorations');


const WorldArea = {
    oninit: function (vnode) {
        World.connect();
        this.columns = true;
    },

    view: function(vnode) {
        return [
            m('div', { id: "world-chat", class: this.columns ? 'column-view' : '' }, [
                m('div', { id: "world-logs" }, 
                    m(WorldLogs, { logs: World.logs })),
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
            vnode.attrs.prompt ? m(WorldViewPrompt, { prompt: vnode.attrs.prompt }) : '',
            vnode.attrs.view.details ? m(WorldViewDetails, { details: vnode.attrs.view.details }) : '',
            m(WorldViewPlayer, { player: vnode.attrs.view.player }),
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
                m(View.Field, { class: 'title', obj: vnode.attrs.location, attr: 'title' }),
                m(View.Field, { class: 'description', obj: vnode.attrs.location, attr: 'description' }),
                m('div', { class: 'tinylabel' }, m(WorldVerbList, { item: vnode.attrs.location })),
                vnode.attrs.location.audio ? m('audio', { src: vnode.attrs.location.audio, controls: true, autoplay: true, style: 'float: right; width: 120px;' }) : '',
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
                m(View.Field, { class: 'title', obj: vnode.attrs.player, attr: 'title' }),
                m(View.Field, { class: 'description', obj: vnode.attrs.player, attr: 'description' }),
                m('div', { class: 'tinylabel' }, m(WorldVerbList, { item: vnode.attrs.player })),
                m('span', { class: 'tinylabel' }, "You are carrying"),
                m(WorldViewContents, { contents: vnode.attrs.player.contents }),
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
            let parts = verb.split(/[\/|]/, 1);
            verbs.push(m('a', { onclick: World.doVerb.bind(World, parts[0], vnode.attrs.item) }, parts[0]));
            verbs.push(", ");
        });
        verbs.pop();
        verbs.push(")");
        return verbs;
    },
};

const WorldViewPrompt = {
    submit: function (prompt) {
        World.sendResponse(prompt, prompt.response);
        World.prompt = null;
    },

    cancel: function () {
        World.prompt = null;
    },

    view: function (vnode) {
        return m(View.Box, { class: 'prompt-info slide-down' }, [
            vnode.attrs.prompt.errors ? m('div', { class: 'error' }, vnode.attrs.prompt.errors.map((err) => { return m('span', err); })) : '',
            m('span', { class: 'tinylabel' }, vnode.attrs.prompt.form.label),
            m(View.Form, { fields: vnode.attrs.prompt.form.fields, value: vnode.attrs.prompt.response }),
            m('button', { class: 'tinylabel', onclick: this.submit.bind(this, vnode.attrs.prompt) }, vnode.attrs.prompt.form.submit ? vnode.attrs.prompt.form.submit : 'Submit'), " ",
            m('button', { class: 'tinylabel', onclick: this.cancel.bind(this) }, vnode.attrs.prompt.form.cancel ? vnode.attrs.prompt.form.cancel : 'Cancel'),
        ]);
    },
};

module.exports = WorldArea;
 
