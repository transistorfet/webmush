
'use strict';

const m = require('mithril');

const View = require('../views');
const FileInfo = require('./model');


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
        this.selected = (vnode.attrs.value || '').split('?');
        FileInfo.load();
    },

    change: function (onchange, pos, value) {
        this.selected[pos] = value;
        if (onchange)
            onchange(this.selected[1] ? this.selected.join('?') : this.selected[0]);
        console.log(this.selected);
    },

    view: function (vnode) {
        let files = FileInfo.files;
        if (vnode.attrs.filter) {
            let filter = new RegExp(vnode.attrs.filter);
            files = files.filter((file) => { return file.mimetype.match(vnode.attrs.filter); });
        }
        let info = files.find((file) => { return file.path == this.selected[0] });

        return [
            m('select', { onchange: m.withAttr('value', this.change.bind(this, vnode.attrs.onchange, 0)) },
                [ m('option', { value: '' }, '(none)') ].concat(files.map(function (file) {
                    return m('option', { value: file.path, selected: file.path == this.selected[0] }, file.name);
                }.bind(this)))
            ),
            ' ',
            info && info.width && info.height
                ? m(SelectIcon, { icon: this.selected[0], onchange: this.change.bind(this, vnode.attrs.onchange, 1), value: this.selected[1] })
                : m('span', this.selected[0] ? m('img', { class: 'image-preview big', src: this.selected[0] }) : ''),
            ' ',
            m('span', m('a', { href: '/manage', oncreate: m.route.link }, 'Manage Uploads')),
        ];
    },
};

const SmallIcon = function (path, subimage) {
    let icon = path ? path.split('?') : null;
    if (!icon)
        return m('span', { class: 'small-icon' });
    else if (icon[1] || subimage) {
        let args = (subimage ? subimage : icon[1]).split('x');
        return m('span', { class: 'small-icon', style: 'background-image: url("'+icon[0]+'"); background-position: -'+(args[1]*16)+'px -'+(args[0]*16)+'px;' });
    }
    else if (icon[0])
        return m('img', { class: 'small-icon', src: icon[0] });
};

const SelectIcon = {
    oninit: function (vnode) {
        this.selected = (vnode.attrs.value || '0x0').split('x');
        this.info = FileInfo.get(vnode.attrs.icon);
    },

    onupdate: function (vnode) {
        this.selected = (vnode.attrs.value || '0x0').split('x');
    },

    change: function (onchange, event) {
        this.selected[0] = Math.floor((event.layerY - event.target.y) / this.info.height);
        this.selected[1] = Math.floor((event.layerX - event.target.x) / this.info.width);
        if (onchange)
            onchange(this.selected.join('x'));
    },

    view: function (vnode) {
        return [
            m('span', { style: 'border: 2px solid black;' }, SmallIcon(vnode.attrs.icon, this.selected.join('x'))),
            ' ',
            m('span', this.selected ? m('img', { class: 'image-preview big', src: vnode.attrs.icon, onclick: this.change.bind(this, vnode.attrs.onchange) }) : ''),
        ];
    },
};

/*
const SelectIcon = {
    oninit: function (vnode) {
        this.selected = (vnode.attrs.value || '0x0').split('x');
    },

    change: function (onchange, row, col) {
        this.selected[0] = parseInt(this.selected[0]) + row;
        this.selected[1] = parseInt(this.selected[1]) + col;
        console.log("Icon Select", this.selected);
        if (onchange)
            onchange(event);
    },

    view: function (vnode) {
        return [
            m('a', { onclick: this.change.bind(this, vnode.attrs.onchange, 0, -1) }, m.trust('&#9666;')),
            m('span', { style: 'display: inline-block; vertical-align: middle;' }, [
                m('a', { onclick: this.change.bind(this, vnode.attrs.onchange, -1, 0), style: 'display: block; text-align: center;' }, m.trust('&#9652;')),
                SmallIcon(vnode.attrs.icon, this.selected.join('x')),
                m('a', { onclick: this.change.bind(this, vnode.attrs.onchange, 1, 0), style: 'display: block; text-align: center;' }, m.trust('&#9662;')),
            ]),
            m('a', { onclick: this.change.bind(this, vnode.attrs.onchange, 0, 1) }, m.trust('&#9656;')),
        ];
    },
};
*/

module.exports = {
    Uploader,
    Picker,
    Manager,
    SmallIcon,
};

