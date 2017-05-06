
'use strict';

const m = require('mithril');


var decorations = {
    'b': { style: "font-weight: bold;" },
    'i': { style: "font-style: italic;" },
    'red': { style: "color: red;" },
    'green': { style: "color: green;" },
    'status': { class: "status" },
    'chat': { class: "chat" },
    'shout': { class: "shout" },
    'action': { class: "action" },
    'attack': { class: "attack" },
    'defense': { class: "defense" },
    'indent': { style: "padding-left: 1em;" },
};

const parseDecorations = function (text) {
    var start = text.match(/^(.*?)<(\w+)(?:\s+(.*?))?>(.*)$/);
    if (!start)
        return text;
    if (decorations[start[2]]) {
        // TODO parse start[3] arguments
        var end = start[4].match(new RegExp('^(.*?)<\/' + start[2] + '>(.*)$'));
        if (!end)
            return [ start[1], m('span', decorations[start[2]], parseDecorations(start[4])) ];
        else
            return [ start[1], m('span', decorations[start[2]], parseDecorations(end[1])), parseDecorations(end[2]) ];
    }
    else
        return [ text.substr(0, text.length - start[4].length), parseDecorations(start[4]) ];
};

const Decorated = {
    view: function (vnode) {
        return parseDecorations(vnode.children);
    },
};

const Styled = {
    view: function (vnode) {
        return [
            //m('style', generateCSS("."+vnode.attrs.section+"-info", vnode.attrs.style)),
            m('style', vnode.attrs.style),
            vnode.children,
        ];
    },
};

module.exports = {
    parse: parseDecorations,
    Decorated,
    Styled,
};

