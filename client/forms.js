
'use strict';

const m = require('mithril');

const Media = require('./media/components');

class Prompt {
    constructor(id, respond, form, onsubmit, oncancel) {
        this.id = id;
        this.respond = respond;
        this.form = form;
        this.response = { };
        this.errors = null;
        this.onsubmit = onsubmit;
        this.oncancel = oncancel;
    }

    setItem(name, value) {
        // TODO this is not being called by the form yet
        this.response[name] = value;
    }

    getForm(name) {
        return this.subforms[name];
    }

    setForm(name, formdata) {
        this.subforms[name] = formdata;
    }

    submit() {
        if (this.onsubmit)
            this.onsubmit(this, this.response);
    }

    cancel() {
        if (this.oncancel)
            this.oncancel(this);
    }

    render() {
        return m(Form, { prompt: this, onsubmit: this.submit.bind(this), oncancel: this.cancel.bind(this) });
    }
};


const Form = {
    view: function (vnode) {
        vnode.attrs.prompt.setItem('poop', 'thing');
        
        return [
            vnode.attrs.prompt.errors ? m('div', { class: 'error' }, vnode.attrs.prompt.errors.map((err) => { return m('span', err); })) : '',
            m('span', { class: 'tinylabel' }, vnode.attrs.prompt.form.label),
            vnode.attrs.prompt.form.fields ? m(FieldList, { fields: vnode.attrs.prompt.form.fields, value: vnode.attrs.prompt.response }) : '',
            m('button', { class: 'tinylabel', onclick: vnode.attrs.onsubmit }, vnode.attrs.prompt.form.submit ? vnode.attrs.prompt.form.submit : 'Submit'), " ",
            m('button', { class: 'tinylabel', onclick: vnode.attrs.oncancel }, vnode.attrs.prompt.form.cancel ? vnode.attrs.prompt.form.cancel : 'Cancel'),
        ];
    },
};

const Field = function (item) {
    if (item.type == 'switch')
        return m(FieldSwitch, { parent: this, switch: item, onswitch: this.setItem.bind(this, item.name), value: this.value[item.name] });
    else if (item.type == 'file')
        return m(Media.Picker, { onchange: m.withAttr('value', this.setItem.bind(this, item.name)), filter: item.filter, value: this.value[item.name] });
    else if (item.type == 'code')
        return m(CodeEditor, { name: item.name, oninput: m.withAttr('value', this.setItem.bind(this, item.name)), value: this.value[item.name] });
    else if (item.type == 'select')
        return m('select', { name: item.name, onchange: m.withAttr('value', this.setItem.bind(this, item.name)) }, item.options.map(function (opt) {
            return m('option', {
                value: typeof opt == 'object' ? opt.value : opt,
                selected: (typeof opt == 'object' ? opt.value : opt) == this.value[item.name],
            }, typeof opt == 'object' ? opt.label : opt);
        }.bind(this)));
    else if (item.type == 'textarea')
        return m('textarea', { name: item.name, oninput: m.withAttr('value', this.setItem.bind(this, item.name)), value: this.value[item.name] });
    else
        return m('input', { type: item.type, name: item.name, oninput: m.withAttr('value', this.setItem.bind(this, item.name)), value: this.value[item.name] });
};


const FieldList = {
    oninit: function (vnode) {
        this.value = vnode.attrs.value || { };
        vnode.attrs.fields.map(function (item) {
            this.value[item.name] = item.value;
        }.bind(this));
        console.log("FORM DATA", this.value);
    },

    onupdate: function (vnode) {
        if (this.value != vnode.attrs.value) {
            console.log("UPDATE", vnode.attrs.value);
            this.value = vnode.attrs.value;
        }
    },

    setItem: function (name, value) {
        //console.log("SET", name, value);
        this.value[name] = value;
    },

    view: function (vnode) {
        return m('table', vnode.attrs.fields.map(function (item) {
            return m('tr', [
                m('td', m('label', item.label)),
                m('td', Field.call(this, item)),
            ]);
        }.bind(this)));
    },
};

const FieldSwitch = {
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
            m(FieldList, { fields: this.selected.fields, value: this.value[this.selected.name] }),
            //FormTable.call(vnode.attrs.parent, this.selected.fields),
        ];
    },
};


const CodeEditor = {
    keydown: function (vnode, event) {
        if (event.key == 'Tab') {
            event.preventDefault();
            let start = event.target.selectionStart;
            event.target.value = event.target.value.substr(0, start) + '  ' + event.target.value.substr(event.target.selectionEnd);
            vnode.attrs.oninput(event.target.value);
            event.target.selectionStart = event.target.selectionEnd = start + 2;
        }
    },

    view: function (vnode) {
        return m('textarea', Object.assign(vnode.attrs, { onkeydown: this.keydown.bind(this, vnode) }));
    },
};



/*
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
*/


module.exports = {
    Prompt,
    Form,
    Field,
    FieldList,
    FieldSwitch,
    CodeEditor,
};
 
