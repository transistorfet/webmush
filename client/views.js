
'use strict';

const m = require('mithril');


const Box = {
    expand: true,
    view: function (vnode) {
        if (!vnode.state.expand) {
            return m('div[class=viewbox]', vnode.attrs, [
                m('a', { class: 'viewbox-expand', onclick: () => { vnode.state.expand = true; } }, 'more'),
                vnode.children.slice(0, 2),
            ]);
        }
        else {
            return m('div[class=viewbox]', vnode.attrs, [
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

String.prototype.capitalize = function () {
    return this.length > 0 ? this.charAt(0).toUpperCase() + this.slice(1) : '';
};

String.prototype.capitalizeAll = function () {
    return this.split().map((word) => { return word.charAt(0).toUpperCase() + this.slice(1); }).join(' ');
};



/*
const EditableField = {
    value: '',
    editing: false,

    onupdate: function (vnode) {
        vnode.dom.focus();
    },

    startEdit: function (value) {
        this.editing = true;
        this.value = value;
    },

    endEdit: function (obj, attr, value) {
        console.log("NEW", this, arguments);
        this.editing = false;
        World.editAttr(obj, attr, value);
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
            }, vnode.attrs), this.value);
        else
            return m('div', Object.assign({ onclick: this.startEdit.bind(this, vnode.children) }, vnode.attrs), vnode.children);
    },
};
*/

module.exports = {
    Box,
    EditableField,
    EditableText,
};

