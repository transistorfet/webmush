
'use strict';

const m = require('mithril');

const View = require('../views');
const FileInfo = require('./model');


const Uploader = {
    src: '',
    file: null,

    updatePreview: function (files) {
        let self = this;

        if (files && files[0]) {
            self.file = files[0];
            console.log("FI", files);
            let reader = new FileReader();
            reader.onload = function (e) {
                console.log("Loaded", e);
                self.src = e.target.result;
                m.redraw();
            };
            reader.readAsDataURL(files[0]);
        }
    },

    upload: function (onupload) {
        if (this.file) {
            FileInfo.upload(this.file, function (path) {
                this.src = '';
                this.file = null;
                FileInfo.load(null, true);
            }.bind(this));
        }
    },

    view: function (vnode) {
        return m('div', { class: 'image-uploader' }, [
            m('div', [
                m('span', this.src ? m('img', { class: 'image-preview', src: this.src }) : ''),
                m('span', this.file ? this.file.type : ''),
            ]),
            m('span', { class: "form-item" }, [
                m('input', { type: 'file', onchange: m.withAttr('files', this.updatePreview, this) }),
            ]),
            m('input', { type: 'submit', value: 'Upload', onclick: this.upload.bind(this, vnode.attrs.onupload) }),
        ]);
    },
};

const Preview = {

};


const Picker = {
    oninit: function (vnode) {
        this.selected = vnode.attrs.value || null;
        FileInfo.load();
    },

    change: function (onchange, event) {
        this.selected = event.target.value;
        if (onchange)
            onchange(event);
    },

    view: function (vnode) {
        let files = FileInfo.files;
        if (vnode.attrs.filter) {
            let filter = new RegExp(vnode.attrs.filter);
            files = files.filter((file) => { return file.mimetype.match(vnode.attrs.filter); });
        }

        return [
            //m('select', { onchange: m.withAttr('value', this.change.bind(this, vnode.attrs.onchange)) }, FileInfo.files.map(function (file) {
            m('select', Object.assign({}, vnode.attrs, { onchange: this.change.bind(this, vnode.attrs.onchange) }),
                [ m('option', { value: '' }, '(none)') ].concat(files.map(function (file) {
                    return m('option', { value: file.path, selected: file.path == this.selected }, file.name);
                }.bind(this)))
            ),
            m('span', this.selected ? m('img', { class: 'image-preview big', src: this.selected }) : ''),
            m('span', m('a', { href: '/manage', oncreate: m.route.link }, 'Manage Uploads')),
        ];
    },
};

const Manager = {
    oninit: function (vnode) {
        FileInfo.load();
    },

    view: function (vnode) {
        // TODO if not logged in, then display an alternate message
        let files = FileInfo.files.filter((file) => { return file.editable; });

        return m('div', { class: 'viewbox' }, [
            FileInfo.error ? m('div', { class: 'error' }, FileInfo.error) : '',
            m('span', files.length + " files, " + (files.reduce((acc, item) => { return acc + item.size; }, 0) / Math.pow(2, 20)).toFixed(2) + " MiB" + " / " + (FileInfo.quota / Math.pow(2, 20)).toFixed(2) + " MiB"),
            m('table',  files.map(function (item) {
                return m('tr', [
                    m('td', m(View.EditableText, { ondone: FileInfo.rename.bind(FileInfo, item.path), value: item.name })),
                    item.mimetype.match(/^image/) ? m('td', m('img', { class: 'image-preview big', src: item.path })) : m('td'),
                    m('td', item.editable ? m('button', { onclick: FileInfo.delete.bind(FileInfo, item.path) }, 'Delete') : ''),
                ]);
            }.bind(this))),
            m('h5', "Upload File"),
            m(Uploader, { onupload: FileInfo.load.bind(FileInfo) }),
        ]);
    },
};



module.exports = {
    Uploader,
    Picker,
    Manager,
};

