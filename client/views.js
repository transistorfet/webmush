
'use strict';

const m = require('mithril');


const Box = {
    expand: true,
    view: function (vnode) {
        if (!vnode.state.expand) {
            return m(!vnode.attrs.borderless ? 'div[class=viewbox]' : 'div', vnode.attrs, [
                m('a', { class: 'viewbox-expand', onclick: () => { vnode.state.expand = true; } }, 'more'),
                vnode.children.slice(0, 2),
            ]);
        }
        else {
            return m(!vnode.attrs.borderless ? 'div[class=viewbox]' : 'div', vnode.attrs, [
                m('a', { class: 'viewbox-expand', onclick: () => { vnode.state.expand = false; } }, 'less'),
                vnode.children,
            ]);
        }
    },
}

const EditableField = {
    value: false,

    onupdate: function (vnode) {
        vnode.dom.focus();
    },

    view: function (vnode) {
        if (this.value !== false)
            return m('textarea', Object.assign({
                oninput: m.withAttr('value', (value) => { this.value = value; }),
                onblur: m.withAttr('value', (value) => { vnode.attrs.ondone(value); this.value = false; }),
                onkeydown: (e) => { if (e.key == 'Escape') this.value = false; },
            }, vnode.attrs), this.value);
        else
            return m('div', Object.assign(!vnode.attrs.disable ? { onclick: () => { this.value = vnode.children; } } : { }, vnode.attrs), vnode.children);
    },
};

const EditableText = {
    value: false,

    onupdate: function (vnode) {
        vnode.dom.focus();
    },

    view: function (vnode) {
        if (this.value !== false)
            return m('input', {
                type: 'text',
                oninput: m.withAttr('value', (value) => { this.value = value; }),
                onblur: m.withAttr('value', (value) => { if (this.value != vnode.attrs.value) vnode.attrs.ondone(value); this.value = false; }),
                onkeypress: (e) => { if (e.key == 'Escape') this.value = false; },
                value: this.value,
            });
        else
            return m('span', { onclick: () => { this.value = vnode.attrs.value; } }, vnode.attrs.value);
    },
};

module.exports = {
    Box,
    EditableField,
    EditableText,
};

