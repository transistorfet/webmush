
'use strict';

const fs = require('fs');

const Error = require('./error');


let Objects = [ ];

const DB = {
    Classes: [ ],
    //objects: [ ],
    mark: [ ],
    reservedObjects: 32,

    initialize(index, list) {
        //let keys = Object.keys(list);
        //for (let i = 0; i < keys.length; i++) {
        for (let key in list) {
            Objects[index] = list[key];
            Objects[index].id = index;
            // TODO also add DB[key] = list[key] ???
            //DB[key] = list[key];
            DB.Classes[key] = list[key];
            index++;
        }
    },

    register(cls) {
        DB.Classes[cls.name] = cls;
    },

    get_object(id, filter) {
        if (id && id >= 0 && id < Objects.length && (!filter || (Objects[id] instanceof filter)))
            return Objects[id];
        return null;
    },

    set_object(id, obj) {
        if (id && Objects[id])
            throw "Error: request object id is already being used, " + id;
        if (id < 0)
            return id;
        obj.id = id ? id : Objects.length;
        Objects[obj.id] = obj;
        return id;
    },

    del_object(obj) {
        Objects[obj.id] = null;
        //fs.unlinkSync('data/objects/'+this.id+'.json');
        // TODO also delete media, or at least put it in an attic so that if the id is recycled, the new user can't access old content
        obj.id = -1;
    },


    loadObjects() {
        console.log("Loading Object DB");
        let start = Date.now();
        try {
            let data = JSON.parse(fs.readFileSync('data/objects/world.json', 'utf8'));
            DB.parseData(data, data);

            Objects.forEach(function (obj) {
                if (obj && obj.onLoad)
                    obj.onLoad();
            });
        }
        catch (e) {
            console.log(e.stack);
            Objects = null;
            throw e;
        }
        console.log("Load completed in " + (Date.now() - start) + "ms");
    },

    parseData(data, recurse) {
        if (data === null)
            return data;
        else if (Array.isArray(data))
            return data.map((value) => { return DB.parseData(value, recurse); });
        else if (typeof data === 'string' && data.match(/^function /))
            return eval("(" + data + ")");
        else if (typeof data === 'object') {
            if (data['$ref']) {
                if (data['$ref'] < Objects.length && Objects[data['$ref']])
                    return Objects[data['$ref']];
                else
                    return DB.makeObject(recurse[data['$ref'] - DB.reservedObjects], recurse);
                    //return DB.makeObject(getter(data['$ref']), getter);
                    //getter = function (id) { return data[id - DB.reservedObjects] };
            }
            else if (data['$type'] && data['id']) {
                // TODO having this here necessitates a garbage collection phase before saving, but leaving this out means only referenced objects will be loaded
                return DB.makeObject(recurse[data['id'] - DB.reservedObjects], recurse);
            }
            else {
                let obj = data['$class'] ? new DB.Classes[data['$class']]() : { };
                for (let k in data) {
                    obj[k] = DB.parseData(data[k], recurse);
                }
                return obj;
            }
        }
        else
            return data;
    },

    makeObject(data, recurse) {
        let id = parseInt(data['id']);
        let tid = parseInt(data['$type']);
        let pid = data['$prototype'] ? parseInt(data['$prototype']) : null;
        if (tid < 0 || tid >= Objects.reservedObjects)
            throw "Load Error: Unable to load object with a non-standard type id " + tid;

        let obj;
        if (Objects[id])
            obj = Objects[id];
        else {
            obj = new Objects[tid]({ id: id });
            if (Objects[id] != obj)
                throw "Load Error: object id ignored by constructor for #" + id;
            if (pid !== null)
                Object.setPrototypeOf(obj, Objects[pid]);
        }

        for (let k in data)
            obj[k] = DB.parseData(data[k], recurse);
        //obj.onLoad();

        return obj;
    },



    saveObjects(){
        if (Objects.length <= DB.reservedObjects)
            return;     // don't save if we failed to load objects
        console.log("Saving Object DB -", new Date().toLocaleString());
        let start = Date.now();

        DB.mark = [ ];
        let list = [ ];
        for (let i = DB.reservedObjects; i < Objects.length; i++) {
            if (Objects[i])
                list.push(DB.simplifyObject(Objects[i], true));
        }

        // Delete any unreferenced objects
        for (let i = DB.reservedObjects; i < Objects.length; i++) {
            if (!DB.mark[i])
                console.log("UNREF", i);
            if (!DB.mark[i] && Objects[i] && Objects[i].recycle === true) {
                DB.del_object(this);
                delete list[i - DB.reservedObjects];
            }
        }
        let output = JSON.stringify(list, undefined, 2) + '\n';

        try {
            // TODO delete old backups
            fs.renameSync('data/objects/world.json', 'data/objects/backup/' + Math.floor(Date.now() / 1000) + '-world.json');
            fs.writeFileSync('data/objects/world.json', output, 'utf8');
        }
        catch (e) {
            console.log(e.stack);
        }
        console.log("Save completed in " + (Date.now() - start) + "ms");
    },

    simplifyObject(value, noRef) {
        if (Array.isArray(value))
            return value.map((value) => { return DB.simplifyObject(value); });
        else if (typeof value == 'object') {
            if (value instanceof Root && !noRef) {
                DB.mark[value.id] = true;
                return { $ref: value.id };
            }
            else if (value === null || value['$nosave'])
                return null;
            else {
                let jsonobj = { };
                if (value instanceof Root) {
                    jsonobj['$type'] = value.constructor.id;
                    jsonobj['$prototype'] = Object.getPrototypeOf(value).id;
                    DB.mark[jsonobj['$type']] = true;
                    DB.mark[jsonobj['$prototype']] = true;
                }
                else if (value.constructor && value.constructor != Object && value.constructor.name) {
                    if (!DB.Classes[value.constructor.name])
                        console.log("WARN: saving object with a registered class: " + value.constructor.name);
                    jsonobj['$class'] = value.constructor.name;
                    DB.mark[jsonobj['$class']] = true;
                }

                for (let key in value) {
                    if (!value.hasOwnProperty(key))
                        continue;
                    jsonobj[key] = DB.simplifyObject(value[key]);
                }
                return jsonobj;
            }
        }
        else if (typeof value == 'function')
            return value.toString();
        else
            return value;
    },
};



process.on('exit', () => { DB.saveObjects(); });
process.on('SIGINT', () => { process.exit(); });
process.on('SIGUSR2', () => { process.exit(); });

const savePeriodically = function () {
    setTimeout(function () {
        DB.saveObjects();
        savePeriodically();
    }, 600000);
};
savePeriodically();


Objects = Objects.concat(Array(DB.reservedObjects - Objects.length).fill(null));    // Reserve space for future class objects

/*
const ObjectRef = function (id) {
    return new Proxy({ id }, {
        get: function (target, name) {
            return Objects[target.id][name];
        },
    });
};

let location = ObjectRef(9);
console.log(location.name, location);
*/



class Root {
    constructor(options) {
        DB.set_object(options ? options.id : undefined, this);
        this.name = "unnamed object";
        this.aliases = [];
        this.location = null;
        this.contents = [];

        if (options && options.cloning) {
            this.name = options.cloning.name;
            this.aliases = options.cloning.aliases.slice(0);
        }
    }

    clone(args) {
        let obj = new this.constructor({ cloning: this });      // cloning allows any constructors to choose to copy over attributes
        Object.setPrototypeOf(obj, this);
        if (args && args.player)
            args.player.tell(this.format("New object created: #{id} {name}", obj));
        return obj;
    }

    recycle() {
        //this.id = -1;
        this.recycle = true;
    }

    onLoad() {
        // do nothing
    }

    format(text, args) {
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

    moveto(location) {
        if (!location || this.location == location)
            return false;

        for (let where = location; where; where = where.location) {
            if (where == this)
                return false;
        }

        if (this.location && !this.location.ejectable(this))
            return false;
        if (location && !location.acceptable(this))
            return false;

        let oldLocation = this.location;
        if (oldLocation) {
            oldLocation.contents = oldLocation.contents.filter((item) => { return item != this });
            oldLocation.update_contents();
        }
        location.contents.push(this);
        this.location = location;
        location.update_contents();
        console.log("Moved", this.id, "to", this.location.id);
        return true;
    }


    acceptable(obj) {
        return false;
    }

    ejectable(obj) {
        return true;
    }

    /*
    moveable_by(player) {
        return false;
    }
    */

    tell(text) {
        // do nothing
    }

    get title() { return this.name.capitalize(); }
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
        let signature = this.verbs_for(player, true).find((v) => { return v.split('|').shift().split('/').indexOf(verb) != -1; });
        if (!signature)
            return false;

        let parts = signature.split('|');
        let funcname = parts[0].split('/', 1)[0];

        if (parts[1]) {
            if (parts[1] == 'prompt' && !this.check_form(args, funcname))
                return true;
            else if (!this.check_args(args, parts[1]))
                return false;
        }
        this[funcname].apply(this, [args]);
        return true;
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
            args.player.prompt(this.id, name, form ? form : this.get_form_for(args.player, name));
            return false;
        }
        else
            this.validate_form_for(args.player, args.response, form ? form : name);
        return true;
    }

    editable_by(player) {
        return ['name', 'aliases|a', 'title'];
    }

    edit_by(player, attr, value) {
        // TODO add support for subelements of attributes (like style.icon)
        let editables = this.editable_by(player);
        if (!attr.match(/^[\w]+$/))
            throw "That attribute name is invalid";

        let info = editables.find((i) => { return i.split('|')[0] == attr; });
        if (!info)
            throw "You aren't allowed to edit that attribute";

        let typename = info.split('|').pop();
        if (!typename) typename = 's';
        if (typename in typeLetters && typeLetters[typename](value, this))
            throw "The value for that attribute must be an " + typename;

        this[attr] = value;
        this.update_contents();
        return true;
    }

    get_form_for(player, name) {
        return null;
    }

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
                if (typeof value != 'string' || !value.match(/^(\/\w+)+/))
                    errors.push(form.fields[i].label + " is an invalid filename.");
            }
            if (form.fields[i].validate && !form.fields[i].validate(value))
                errors.push(form.fields[i].label + " is invalid.");
        }

        if (errors.length > 0)
            throw new Error.Validation(errors);
    }
}

var typeLetters = {
    n: (v) => { return typeof v == 'number'; },
    s: (v) => { return typeof v == 'string'; },
    a: (v) => { return Array.isArray(v); },
    o: (v) => { return v instanceof Root; },
    t: (v, t) => { return v == t; },
};


module.exports = {
    DB,
    Root,
};

