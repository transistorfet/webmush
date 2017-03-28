
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
        this.response = new ResponseData(form);
        this.errors = null;
        this.onsubmit = onsubmit;
        this.oncancel = oncancel;
    }

    setItem(name, value) {
        // TODO this is not being called by the form yet
        this.response[name] = value;
    }

    submit() {
        if (this.onsubmit)
            this.onsubmit(this, this.response.getResponse());
    }

    cancel() {
        if (this.oncancel)
            this.oncancel(this);
    }

    render() {
        return m(Form, { prompt: this, onsubmit: this.submit.bind(this), oncancel: this.cancel.bind(this) });
    }
};


class ResponseData {
    constructor(item) {
        this.initialize(item);
    }

    initialize(item) {
        this.response = { };
        item.fields.map(function (item) {
            if (item.fields)
                this.response[item.name] = new ResponseData(item);
            else if (item.type == 'switch')     // TODO we probably shouldn't be so specific
                this.response[item.name] = new ResponseData(item.options.find((opt) => { return opt.name == item.value }));
            else if (!item.value && item.options)
                this.response[item.name] = item.options[0].value;
            else
                this.response[item.name] = item.value;
        }.bind(this));
    }

    getResponse() {
        let response = { };
        Object.keys(this.response).map(function (key) {
            if (this.response[key] instanceof ResponseData)
                response[key] = this.response[key].getResponse();
            else
                response[key] = this.response[key];
        }.bind(this));
        console.log("RESPONSE", response);
        return response;
    }

    setItem(name, value) {
        this.response[name] = value;
    }

    getItem(name) {
        return this.response[name];
    }
}


const Form = {
    view: function (vnode) {
        let form = vnode.attrs.prompt.form;
        let errors = vnode.attrs.prompt.errors;
        let response = vnode.attrs.prompt.response;
        return [
            errors ? m('div', { class: 'error' }, errors.map((err) => { return m('div', err); })) : '',
            m('span', { class: 'tinylabel' }, form.label),
            form.fields ? m(FieldList, { fields: form.fields, response: response }) : '',
            m('button', { class: 'tinylabel', onclick: vnode.attrs.onsubmit }, form.submit ? form.submit : 'Submit'), " ",
            m('button', { class: 'tinylabel', onclick: vnode.attrs.oncancel }, form.cancel ? form.cancel : 'Cancel'),
        ];
    },
};

const FieldList = {
    view: function (vnode) {
        // TODO can you change this to call a function to draw the row, and most scalar values will use the tr/td code below using a component with the field itself as the children
        //      but the form/switch/etc elements will replace that with their own
        return m('table', { class: 'form-table' }, vnode.attrs.fields.map(function (item) {
            let info = FieldInfo(item, vnode.attrs.response);
            return m('tr', [
                m('td', m('label', item.label ? item.label : item.name.capitalize())),
                m('td', !info ? { colspan: 2 } : undefined, Field.call(this, item, vnode.attrs.response)),
                info ? m('td', m('div', { class: 'option-info' }, info)) : '',
            ]);
        }.bind(this)));
    },
};

const FieldInfo = function (item, data) {
    if (!item.options)
        return item.info;
    let selected = item.options.find((opt) => { return opt.value == data.getItem(item.name); });
    return selected ? selected.info : null;
};


const Field = function (item, data) {
    if (item.type == 'switch')
        return m(FieldSwitch, { switch: item, response: data });
    else if (item.type == 'fields')
        return m(FieldList, { fields: item.fields, response: data });
    else if (item.type == 'file')
        return m(Media.Picker, { onchange: data.setItem.bind(data, item.name), filter: item.filter, value: data.getItem(item.name) });
    else if (item.type == 'code')
        return m(CodeEditor, { name: item.name, oninput: m.withAttr('value', data.setItem.bind(data, item.name)), value: data.getItem(item.name) });
    else if (item.type == 'select')
        return FieldSelect(item, data);
    else if (item.type == 'textarea')
        return m('textarea', { name: item.name, oninput: m.withAttr('value', data.setItem.bind(data, item.name)), value: data.getItem(item.name) });
    else
        return m('input', { type: item.type, name: item.name, oninput: m.withAttr('value', data.setItem.bind(data, item.name)), value: data.getItem(item.name) });
};

const FieldSelect = function (item, data) {
    return m('select', { name: item.name, onchange: m.withAttr('value', data.setItem.bind(data, item.name)) }, item.options.map(function (opt) {
        let [value, label, info] = typeof opt == 'object' ? [opt.value, opt.label ? opt.label : opt.value, opt.info] : [opt, opt, ''];
        let selected = data.getItem(item.name);
        return m('option', {
            value: value,
            selected: value == selected,
        }, label);
    }));
};



const FieldSwitch = {
    oninit: function (vnode) {
        console.log("NEW SWITCH", vnode.attrs.switch);
        this.select(vnode, vnode.attrs.switch.value || vnode.attrs.switch.options[0].name);
    },

    select: function (vnode, value) {
        this.selected = vnode.attrs.switch.options.find((item) => { return item.name == value });
        vnode.attrs.response.setItem(vnode.attrs.switch.name+"_switch", this.selected.name);
        let data = vnode.attrs.response.getItem(vnode.attrs.switch.name);
        data.initialize(this.selected);
        console.log("SELECT", vnode.attrs.response, value, this.selected, data);
    },

    view: function (vnode) {
        console.log("DATA", vnode.attrs.response.getItem(vnode.attrs.switch.name));
        return [
            m('div', { class: 'form-switch' }, vnode.attrs.switch.options.map(function (item) {
                return [
                    m('input', { type: 'radio', name: vnode.attrs.switch.name, onchange: m.withAttr('value', this.select.bind(this, vnode)), value: item.name, checked: this.selected == item.name }),
                    m('label', item.label),
                ];
            }.bind(this))),
            Field(this.selected, vnode.attrs.response.getItem(vnode.attrs.switch.name)),
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
 
