
'use strict';

const m = require('mithril');

const Media = require('./media/components');

let _seq = 0;

class Prompt {
    constructor(id, respond, form, onsubmit, oncancel) {
        this.seq = _seq++;
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
        let form = vnode.attrs.prompt.form;
        let errors = vnode.attrs.prompt.errors;
        let response = vnode.attrs.prompt.response;
        return [
            errors ? m('div', { class: 'error' }, errors.map((err) => { return m('div', err); })) : '',
            m('span', { class: 'tinylabel' }, form.label),
            form.fields ? m(FieldList, { fields: form.fields, value: response }) : '',
            m('button', { class: 'tinylabel', onclick: vnode.attrs.onsubmit }, form.submit ? form.submit : 'Submit'), " ",
            m('button', { class: 'tinylabel', onclick: vnode.attrs.oncancel }, form.cancel ? form.cancel : 'Cancel'),
        ];
    },
};

const Field = function (item) {
    if (item.type == 'switch')
        return m(FieldSwitch, { parent: this, switch: item, onswitch: this.setItem.bind(this, item.name), value: this.value[item.name] });
    else if (item.type == 'fields')
        return m(FieldList, { fields: item.fields, onchange: m.withAttr('value', this.setItem.bind(this, item.name)), value: this.value[item.name] });
    else if (item.type == 'file')
        return m(Media.Picker, { onchange: m.withAttr('value', this.setItem.bind(this, item.name)), filter: item.filter, value: this.value[item.name] });
    else if (item.type == 'code')
        return m(CodeEditor, { name: item.name, oninput: m.withAttr('value', this.setItem.bind(this, item.name)), value: this.value[item.name] });
    else if (item.type == 'select')
        return m('select', { name: item.name, onchange: m.withAttr('value', this.setItem.bind(this, item.name)) }, item.options.map(function (opt) {
            let [value, label, info] = typeof opt == 'object' ? [opt.value, opt.label ? opt.label : opt.value, opt.info] : [opt, opt, ''];
            return m('option', {
                value: value,
                selected: value == this.value[item.name],
            }, label);
        }.bind(this)));
    else if (item.type == 'textarea')
        return m('textarea', { name: item.name, oninput: m.withAttr('value', this.setItem.bind(this, item.name)), value: this.value[item.name] });
    else
        return m('input', { type: item.type, name: item.name, oninput: m.withAttr('value', this.setItem.bind(this, item.name)), value: this.value[item.name] });
};

const FieldInfo = function (item) {
    if (!item.options)
        return item.info;
    let selected = item.options.find((opt) => { return opt.value == this.value[item.name]; });
    return selected ? selected.info : null;
};


const FieldList = {
    oninit: function (vnode) {
        this.value = vnode.attrs.value;
        vnode.attrs.fields.map(function (item) {
            if (!item.value && item.options)
                this.value[item.name] = item.options[0].value;
            else
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
        return m('table', { class: 'form-table' }, vnode.attrs.fields.map(function (item) {
            let info = FieldInfo.call(this, item);
            return m('tr', [
                m('td', m('label', item.label ? item.label : item.name.capitalize())),
                m('td', !info ? { colspan: 2 } : undefined, Field.call(this, item)),
                info ? m('td', m('div', { class: 'option-info' }, info)) : '',
            ]);
        }.bind(this)));
    },
};

const FieldSwitch = {
    oninit: function (vnode) {
        console.log("NEW SWITCH", vnode.attrs.switch);
        this.select(vnode, vnode.attrs.switch.value);
    },

    onupdate: function (vnode, value) {
        //if (this.value[this.selected.name] != vnode.attrs.value)
        //    this.value[this.selected.name] = vnode.attrs.value;
    },

    select: function (vnode, value) {
        this.selected = vnode.attrs.switch.options.find((item) => { return item.name == value; });
        vnode.attrs.parent.setItem(vnode.attrs.switch.name+"_switch", this.selected.name);
        let response = !this.selected.fields
            ? this.selected.value
            : this.selected.fields.reduce(function (response, item) {
                response[item.name] = item.value;
                return response;
            }, {});
        vnode.attrs.parent.setItem(vnode.attrs.switch.name, response);
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
            Field.call(vnode.attrs.parent, this.selected),
            //m(FieldList, { fields: this.selected.fields, value: this.value[this.selected.name] }),
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



Form.create("Editing style for ???", this.style, [
    Form.file('background', 'Background Image', '^image'),
    Form.text('backgroundPos', 'Background Position', (v) => { }),
    Form.switch('font', [
        Form.text('fontname', 'Font Name'),
        Form.file('fontfile', 'Font File', '^application/x-font-'),
    ]),
]);

*/


module.exports = {
    Prompt,
    Form,
    Field,
    FieldList,
    FieldSwitch,
    CodeEditor,
};
 
