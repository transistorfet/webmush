
'use strict';

const m = require('mithril');

const World = require('../model');


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

const Field = {
    view: function (vnode) {
        if (vnode.attrs.obj.editable.find((attr) => { return attr.split('|')[0] == vnode.attrs.attr; }))
            return m(EditableField, vnode.attrs, vnode.attrs.obj[vnode.attrs.attr]);
        else
            return m('div', vnode.attrs, vnode.attrs.obj[vnode.attrs.attr]);
    },
};

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

module.exports = {
    Box,
    Field,
    EditableField,
};

