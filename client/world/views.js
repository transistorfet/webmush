
'use strict';

const m = require('mithril');

const World = require('./model');
const Media = require('../media/components');


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

    startEdit: function (value) {
        this.editing = true;
        this.value = value;
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
            }, vnode.attrs), this.value);
        else
            return m('div', Object.assign({ onclick: this.startEdit.bind(this, vnode.children) }, vnode.attrs), vnode.children);
    },
};


const Form = {
    oninit: function (vnode) {
        this.value = vnode.attrs.value || { };
        vnode.attrs.fields.map(function (item) {
            this.value[item.name] = item.value;
        }.bind(this));
        console.log("FORM DATA", this.value);
    },

    onupdate: function (vnode) {
        console.log("UPDATE", vnode.attrs.value);
        if (this.value != vnode.attrs.value)
            this.value = vnode.attrs.value;
    },

    setItem: function (name, value) {
        console.log("SET", name, value);
        this.value[name] = value;
    },

    view: function (vnode) {
        return m('table', vnode.attrs.fields.map(function (item) {
            return m('tr', [
                m('td', m('label', item.label)),
                m('td', FormField.call(this, item)),
            ]);
        }.bind(this)));
    },
};

const FormField = function (item) {
    if (item.type == 'switch')
        return m(FormSwitch, { parent: this, switch: item, onswitch: this.setItem.bind(this, item.name), value: this.value[item.name] });
    else if (item.type == 'file')
        return m(Media.Picker, { onchange: m.withAttr('value', this.setItem.bind(this, item.name)), filter: item.filter, value: this.value[item.name] });
    else if (item.type == 'select')
        return m('select', { name: item.name, onchange: m.withAttr('value', this.setItem.bind(this, item.name)) }, item.options.map((opt) => { return m('option', { value: opt.value, selected: opt.value == this.value[item.name] }, opt.label); }))
    else if (item.type == 'textarea')
        return m('textarea', { name: item.name, oninput: m.withAttr('value', this.setItem.bind(this, item.name)), value: this.value[item.name] })
    else
        return m('input', { type: item.type, name: item.name, oninput: m.withAttr('value', this.setItem.bind(this, item.name)), value: this.value[item.name] })
};

const FormSwitch = {
    oninit: function (vnode) {
        console.log("NEW SWITCH", vnode.attrs.switch);
        this.value = { };
        vnode.attrs.switch.options.forEach(function (item) {
            this.value[item.name] = { };
            item.fields.map(function (subitem) {
                this.value[item.name][subitem.name] = subitem.value;
            }.bind(this));
        }.bind(this));

        this.select(vnode, vnode.attrs.switch.value);
    },

    onupdate: function (vnode, value) {
        if (this.value[this.selected.name] != vnode.attrs.value)
            this.value[this.selected.name] = vnode.attrs.value;
    },

    select: function (vnode, value) {
        this.selected = vnode.attrs.switch.options.find((item) => { return item.name == value; });
        vnode.attrs.parent.setItem(vnode.attrs.switch.name+"_switch", this.selected.name);
        vnode.attrs.parent.setItem(vnode.attrs.switch.name, this.value[this.selected.name]);
        console.log("SELECT", this.selected, vnode.attrs.parent.value);
        vnode.attrs.onswitch(this.selected);
    },

    view: function (vnode) {
        return [
            //m('select', { onchange: m.withAttr('value', this.select.bind(this, vnode)) }, vnode.attrs.switch.options.map((item) => { return m('option', { value: item.name }, item.label); })),
            m('div', { class: 'form-switch' }, vnode.attrs.switch.options.map(function (item) {
                return [
                    m('input', { type: 'radio', name: vnode.attrs.switch.name, onchange: m.withAttr('value', this.select.bind(this, vnode)), value: item.name, checked: this.selected.name == item.name }),
                    m('label', item.label),
                ];
            }.bind(this))),
            m(Form, { fields: this.selected.fields, value: this.value[this.selected.name] }),
            //FormTable.call(vnode.attrs.parent, this.selected.fields),
        ];
    },
};


function NewForm(form, data) {
    return {
        view: function (vnode) {
            return m(Form, { form: form, value: data });
        },
    };
}

class Fields {
    constructor(fields) {
        this.fields = fields;
        this.data = { };
        this.fields.map(function (field) {
            if (field.type == 'switch')
                this.data[field.name] = new SwitchField(field.options);
            else if (field.type == 'form')
                this.data[field.name] = new Fields(field.form);
            else
                this.data[field.name] = new Field(field.value);
        });
    }
}

class SwitchField extends Fields {

}

module.exports = {
    Box,
    Field,
    EditableField,
    Form,
};

