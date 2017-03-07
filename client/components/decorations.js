
'use strict';

const m = require('mithril');


let decorations = {
    'b': { style: "font-weight: bold;" },
    'i': { style: "font-style: italic;" },
    'red': { style: "color: red;" },
    'green': { style: "color: green;" },
    'status': { class: "status" },
    'chat': { class: "chat" },
    'shout': { class: "shout" },
    'action': { class: "action" },
};

const parseDecorations = function (text) {
    let start = text.match(/^(.*?)<(\w+)(?:\s+(.*?))?>(.*)$/);
    if (!start)
        return text;
    if (decorations[start[2]]) {
        // TODO parse start[3] arguments
        let end = start[4].match(new RegExp('^(.*?)<\/' + start[2] + '>(.*)$'));
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

module.exports = parseDecorations;

