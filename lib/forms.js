
'use strict'

module.exports = {
    create(label, fields, submit, cancel) {

    },

    text(name, label, value, validation) {
        return { type: 'text', name: name, label: label, value: value, validation: validation };
    },

    textarea(name, label, value, validation) {

    },

    input(type, name, label, value, validation) {

    },

    file(type, name, label, value, filter, validation) {

    },
};
 

/*
                return { label: "Set Icon", fields: [
                    { name: 'icon', type: 'file', filter: '^image', value: this.icon ? this.icon : '' },
                ] };

            case 'profile':
                return { label: "Your Profile", fields: [
                    { name: 'icon', label: 'Avatar', type: 'file', filter: '^image', value: this.icon ? this.icon : '' },
                    { name: 'aliases', label: 'Aliases', type: 'text', value: this.aliases ? this.aliases.join(', ') : '' },
                    //{ name: 'email', label: 'Email Address', type: 'text', value: this.email },
                ] };
            case 'theme':
                return { label: "Editing Site Theme", fields: [
                    { name: 'theme', type: 'switch', value: typeof this._theme == 'string' ? 'cssfile' : 'options', options: [
                        { name: 'cssfile', type: 'fields', label: 'CSS File', fields: [
                            { name: 'cssfile', type: 'file', filter: 'text/css', value: typeof this._theme == 'string' ? this._theme : '' },
                        ] },
                        { name: 'options', type: 'fields', label: 'Options', fields: [
                            { name: 'background', label: 'Background Image', type: 'file', filter: '^image', value: this._theme ? this._theme.background : '' },
                            { name: 'font', label: 'Font', type: 'text', value: this._theme ? this._theme.font : '' },
                            { name: 'box', label: 'Box CSS', type: 'text', value: this._theme ? this._theme.box : '' },
                            { name: 'title', label: 'Title CSS', type: 'text', value: this._theme ? this._theme.title : '' },
                            { name: 'description', label: 'Description CSS', type: 'text', value: this._theme ? this._theme.description : '' },
                        ] },
                    ] },
                ] };

            case 'customize':
                if (!this.style)
                    this.style = { };
                return { label: "Customize style for \"" + this.title + "\"", fields: [
                    { name: 'background', label: 'Background Image', type: 'file', filter: '^image', value: this.style.background ? this.style.background : '' },
                    { name: 'backgroundPos', label: 'Background Position', type: 'text', value: this.style.backgroundPos ? this.style.backgroundPos : '', validate: (v) => { return !v || v.match(/^(left|center|right|\d{1,3}\%)(\s+(top|center|bottom|\d{1,3}\%))?$/); } },

                    { name: 'font', label: 'Font', type: 'text', value: this.style.font ? this.style.font : '' },
                    //{ name: 'font', type: 'switch', value: this.style && typeof this.style.font == 'string' && this.style.font[0] == '/' ? 'file' : 'text', options: [
                    //    { name: 'file', label: 'Font', type: 'file', value: this.style ? this.style.font : '' },
                    //    { name: 'text', label: 'Font Name', type: 'text', value: this.style ? this.style.font : '' },
                    //] },
                    { name: 'box', label: 'Box CSS', type: 'text', value: this.style.box ? this.style.box : '' },
                    { name: 'title', label: 'Title CSS', type: 'text', value: this.style.title ? this.style.title : '' },
                    { name: 'description', label: 'Description CSS', type: 'text', value: this.style.description ? this.style.description : '' },
                ] };

            case 'create':
                return { label: "What kind of adventurer would you like to be?", fields: [
                    { name: 'kind', type: 'select', required: true, options: Kinds.map((kind) => { return { value: kind.name, info: kind.info }; }) },
                    { name: 'class', type: 'select', required: true, options: Classes.map((kind) => { return { value: kind.name, info: kind.info }; }) },
                    // TODO background/education level and type/family wealth/etc...
                ] };

*/


