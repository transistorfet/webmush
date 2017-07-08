
'use strict';

const Strings = require('../../lib/strings');

const DB = require('./db');
const Utils = require('./utils');
const Error = require('../error');


class Root {
    constructor(options) {
        if (!options)
            options = { };
        if (!options.$mode)
            options.$mode = 'new';

        DB.set_object(options.$id !== undefined ? options.$id : undefined, this);
        if (!options.$noinit)
            this.initialize(options);
    }

    initialize(options) {
        this.name = "unnamed object";
        this.aliases = [];
        this.location = null;
        this.contents = [];

        if (options.$cloning) {
            this.name = options.$cloning.name;
            this.aliases = options.$cloning.aliases.slice(0);
        }
    }

    /*
    static create(args) {
        let obj = new this.constructor();
        if (args && args.player)
            args.player.tell(this.format("New object created: #{id} {name}", obj));
        return obj;
    }
    */

    clone(args) {
        let obj = new this.constructor({ $noinit: true });
        Object.setPrototypeOf(obj, this);
        obj.initialize({ $mode: 'clone', $cloning: this });
        if (args && args.player)
            args.player.tell(this.format("Object cloned as: #{id} {name}", obj));
        return obj;
    }

    recycle() {
        //this.id = -1;
        this.moveto(null, 'force');
        this.recycle = true;
    }

    onLoad() {
        // do nothing
    }

    format(text, args) {
        return Strings.format.call(this, text, args);
/*
        let self = this;
        return text.replace(/{([\^-])?([\w.]+)}/g, function(match, mod, name) { 
            let parts = name.split('.');
            let value = undefined;
            for (let i = 0; i < parts.length; i++) {
                if (!value && parts[i] == 'this')
                    value = self;
                else if (!value && typeof args[parts[i]] != 'undefined')
                    value = args[parts[i]];
                else if (value && typeof value[parts[i]] != 'undefined')
                    value = value[parts[i]];
                else
                    return match;
            }
            if (mod == '-')
                return value.toLowerCase();
            else if (mod == '^')
                return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : '';
            else
                return value;
        });
*/
    }

    match_alias(name) {
        return [ this.name, this.title ].concat(this.aliases).some(function (alias) {
            return alias.toLowerCase().substr(0, name.length) == name;
        });
    }

    find_object(name) {
        name = name.toLowerCase();

        if (name == 'me')
            return this;
        if (name == 'here')
            return this.location;

        let m;
        if (m = name.match(/^#(\d+)$/))
            return DB.get_object(m[1]);

        for (let i = 0; i < this.contents.length; i++) {
            if (this.contents[i].match_alias(name))
                return this.contents[i];
        }

        for (let i = 0; i < this.location.contents.length; i++) {
            if (this.location.contents[i].match_alias(name))
                return this.location.contents[i];
        }
        return null;
    }

    // throws string on failure
    moveto(location, by) {
        if (!by)
            console.log("ERRR", "Oh no! nobody moved a thing");

        // TODO should you still do the checks but catch any errors, so backup fixes can still work; like making sure you aren't wielding something when it's taken from you
        if (by !== 'force') {
            if (!location)
                throw "You can't move something to nowhere.";
            if (this.location == location)
                throw this.format("{this.title} is already there.");

            for (let where = location; where; where = where.location) {
                if (where == this)
                    throw "You can't move something into itself.";
            }

            // TODO maybe if moveto doesn't have a by, it moves without checking these?
            let cando;
            cando = this.location ? this.location.ejectable(this, by) : true;
            if (cando !== true) {
                console.log("not ejectable", cando);
                throw cando;
            }
            cando = this.moveable(location, by);
            if (cando !== true) {
                console.log("not moveable", cando);
                throw cando;
            }
            cando = location ? location.acceptable(this, by) : true;
            if (cando !== true) {
                console.log("not acceptable", cando);
                throw cando;
            }
        }

        let oldLocation = this.location;
        if (oldLocation) {
            oldLocation.contents = oldLocation.contents.filter((item) => { return item != this });
            oldLocation.update_contents();
        }
        this.location = location;
        if (location) {
            location.contents.push(this);
            location.update_contents();
        }
        console.log("Moved", this.id, "to", this.location ? this.location.id : 'null');
        return true;
    }


    acceptable(obj, by) {
        throw this.format("{this.title} is not a container");
    }

    ejectable(obj, by) {
        return true;
    }

    moveable(to, by) {
        return true;
    }

    tell(text) {
        // do nothing
    }

    get title() { if (typeof this.name === 'string') return this.name.capitalize(); return ''; }
    set title(t) { this.name = t; }

    get_view(player) {
        return {
            id: this.id,
            name: this.name,
            title: this.title,
            verbs: this.verbs_for(player),
            editable: this.editable_by(player),
        };
    }

    update_view(section) {
        // do nothing
    }

    update_contents() {
        this.contents.map(function (item) {
            if (item.update_view)
                item.update_view('location');
        });
    }

    verbs_for(player, all) {
        let verbs = [ ];
        if (all)
            verbs.push('help');
        if (all && player.isWizard)
            verbs.push('clone|this', 'recycle|this');
        return verbs;
    }

    help(args) {
        if (args.dobj)
            args.player.tell("Verbs for " + args.dobj.name + ": " + args.dobj.verbs_for(args.player, true).map((item) => { return item.split('|')[0]; }).join(', '));
        else
            args.player.tell("Verbs: " + args.player.verbs_for(args.player, true).concat(args.player.location.verbs_for(args.player, true)).map((item) => { return item.split('|')[0]; }).join(', '));
    }

    do_verb_for(player, verb, args) {
        //'give/put|this to/in object'
        let signatures = this.verbs_for(player, true).filter((v) => { return v.split('|').shift().split('/').indexOf(verb) != -1; });
        if (!signatures)
            return false;

        for (let i = 0; i < signatures.length; i++) {
            let parts = signatures[i].split('|');
            let funcname = parts[0].split('/', 1)[0];

            if (parts[1]) {
                if (parts[1] == 'prompt' && !this.check_form(args, funcname))
                    return true;
                else if (!this.check_args(args, parts[1]))
                    continue;
            }
            //this[funcname].apply(this, [args]);
            this.call_verb(funcname, args);
            return true;
        }
        return false;
    }

    call_verb(verbname, args) {
        this[verbname].apply(this, [args]);
    }

    check_args(args, signature) {
        let types = signature.match(/^(?:(.+?)(?:\s+(.+)\s+(.+?))?)?$/);
        if (!types[1] && args.text || types[1] && ((types[1] == 'string' && !args.dobjstr) || (types[1] == 'object' && !args.dobj) || (types[1] == 'this' && args.dobj != this)))
            return false
        if (!types[2] && args.prep || types[2] && (!args.prep || !args.prep.match(new RegExp('^'+types[2].replace(/\//g, '|')+'$', 'i'))))
            return false;
        if (!types[3] && args.iobj || types[3] && ((types[3] == 'string' && !args.iobjstr) || (types[3] == 'object' && !args.iobj) || (types[3] == 'this' && args.iobj != this)))
            return false;
        return true;
    }

    check_form(args, name, form) {
        if (!args.response) {
            args.player.prompt(this.id, name, form || this.get_form_for(args.player, name));
            return false;
        }
        else
            this.validate_form_for(args.player, args.response, form || name);
        return true;
    }

    editable_by(player) {
        return ['name', 'aliases|array', 'title'];
    }

    // throws string on failure
    edit_by(player, attr, value) {
        // TODO add support for subelements of attributes (like style.icon)
        let editables = this.editable_by(player);
        if (!attr.match(/^[\w]+$/))
            throw "That attribute name is invalid";

        let info = editables.find((i) => { return i.split('|')[0] == attr; });
        if (!info)
            throw "You aren't allowed to edit that attribute";

        let typename = info.split('|').pop();
        if (!typename) typename = 'string';
        if (typename in typeChecks && typeChecks[typename](value, this))
            throw "The value for that attribute must be an " + typename;

        this[attr] = value;
        this.update_contents();
        return true;
    }

    get_form_for(player, name) {
        return null;
    }

    // throws validation error of invalid inputs
    validate_form_for(player, response, name) {
        let errors = [ ];
        let form = typeof name == 'string' ? this.get_form_for(player, name) : name;

        for (let i in form.fields) {
            let value = response[form.fields[i].name];
            if (form.fields[i].required && !value)
                errors.push(form.fields[i].label + " is required.");
            if (form.fields[i].type == 'text') {
                if (typeof value != 'string')
                    errors.push(form.fields[i].label + " must be a string.");
            }
            else if (form.fields[i].type == 'file') {
                if (typeof value != 'string' || (value && !value.match(/^(\/\w+)+/)))
                    errors.push(form.fields[i].label + " is an invalid filename.");
            }
            if (form.fields[i].validate && !form.fields[i].validate(value))
                errors.push(form.fields[i].label + " is invalid.");
        }

        if (errors.length > 0)
            throw new Error.Validation(errors);
    }

    static parse_command(player, verb, text) {
        let args = { player: player, text: text, verb: verb.toLowerCase() };
        Root.parse_preposition(args, text);
        return args;
    }

    static parse_preposition(args, text) {
        let parts = Utils.split_preposition(text);
        if (!parts) {
            args.dobjstr = text;
            args.dobj = args.player.find_object(text);
        }
        else {
            args.dobjstr = parts[1];
            args.prep = parts[2].toLowerCase();
            args.iobjstr = parts[3];
            args.dobj = args.player.find_object(args.dobjstr);
            args.iobj = args.player.find_object(args.iobjstr);
        }
    }
};

var typeChecks = {
    number: (v) => { return typeof v == 'number'; },
    string: (v) => { return typeof v == 'string'; },
    array: (v) => { return Array.isArray(v); },
    object: (v) => { return v instanceof Root; },
    this: (v, t) => { return v == t; },
};

module.exports = Root;
 
