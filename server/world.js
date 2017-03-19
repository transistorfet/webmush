
'use strict';

const fs = require('fs');

const Error = require('./error');
const Utils = require('./utils');
const Style = require('../lib/style');

var Objects = [ ];


class Root {
    constructor() {
        Objects.push(this);
        this.id = Objects.length - 1;
        this.name = "unnamed object";
        this.aliases = [];
        this.location = null;
        this.contents = [];
    }

    /*
    clone() {
        //let cls = class extends this.constructor {};
        //cls.prototype = Object.create(this);
        //return new cls();
        let obj = new this.constructor();
        let id = obj.id;
        Object.assign(obj, this);
        obj.id = id;
        obj.location = null;
        obj.contents = [ ];
        obj.moveto(this.location);
        return obj;
    }
    */

    recycle() {
        // TODO check to make sure there are no references?
        Objects[this.id] = null;
        fs.unlinkSync('data/objects/'+this.id+'.json');
        // TODO also delete media, or at least put it in an attic so that if the id is recycled, the new user can't access old content
        this.id = -1;
        this.recycled = true;
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
        if (m = name.match(/^#(\d+)$/)) {
            if (m[1] < 0 || m[1] >= Objects.length)
                return null;
            return Objects[m[1]];
        }

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

        // TODO check if can leave current location
        if (!location.acceptable(this))
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

    tell(text) {
        // do nothing
    }

    get title() { return this.name.capitalize(); }
    set title(t) { this.name = t; }


    update_contents() {
        this.contents.map(function (item) {
            if (item.update_view)
                item.update_view('location');
        });
    }

    verbs_for(player, all) {
        return [];
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

    check_form(args, name) {
        if (!args.response) {
            args.player.prompt(this.id, name, this.get_form_for(args.player, name));
            return false;
        }
        else
            this.validate_form_for(args.player, name, args.response);
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

    validate_form_for(player, name, response) {
        let errors = [ ];
        let form = this.get_form_for(player, name);

        for (let i in form.form) {
            let value = response[form.form[i].name];
            if (form.form[i].required && !value)
                errors.push(form.form[i].name + " is required.");
            if (form.form[i].type == 'text') {
                if (typeof value != 'string')
                    errors.push(form.form[i].name + " must be a string.");
            }
            else if (form.form[i].type == 'file') {
                if (typeof value != 'string' || value.match(/^(\/\w+)+/))
                    errors.push(form.form[i].name + " is an invalid filename.");
            }
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



class Thing extends Root {
    constructor() {
        super();
        this.description = "You aren't sure what it is.";
    }

    get_view(player) {
        return {
            id: this.id,
            name: this.name,
            title: this.title,
            description: this.description,
            verbs: this.verbs_for(player),
            editable: this.editable_by(player),
        };
    }

    editable_by(player) {
        let props = super.editable_by(player);
        if (player.isWizard || this == player)
            props.push('description');
        return props;
    }
}

class Being extends Thing {

    get title() { return this.fullname ? this.fullname : this.name; }
    set title(t) {
        this.name = t.split(" ", 2)[0];
        this.fullname = t;
    }

    acceptable(obj) {
        return false;
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        verbs.push('hug|this');
        return verbs;
    }

    hug(args) {
        if (this == args.player) {
            args.player.tell("<action>You hug yourself.");
            args.player.location.tell_all_but(args.player, this.format("<action>{player.title} hugs themself.", args));
        }
        else {
            args.player.tell(this.format("<action>You hug {this.title}", args));
            this.tell(this.format("<action>{player.title} hugs you.", args));
            args.player.location.tell_all_but([ this, args.player ], this.format("<action>{player.title} hugs {this.title}", args));
        }
    }
}


let connectedPlayers = [ ];
let allPlayers = [ ];

class Player extends Being {
    constructor() {
        super();
        allPlayers.push(this);
        this.connections = [ ];
        this.saved_location = null;
        this.moveto(Objects[Player.limbo]);

        this.isWizard = false;
        this.position = 'standing';
    }

    onLoad() {
        super.onLoad();
        this.connections = [ ];
        if (this.location != Objects[Player.limbo]) {
            this.saved_location = this.location;
            this.moveto(Objects[Player.limbo]);
        }
    }

    connect(conn) {
        this.connections.push(conn);
        if (connectedPlayers.indexOf(this) == -1)
            connectedPlayers.push(this);

        if (this.connections.length == 1) {
            this.moveto(this.saved_location ? this.saved_location : Objects[Player.lobby]);
            if (this.location == Objects[Player.limbo])
                this.moveto(Objects[Player.lobby]);
            connectedPlayers.forEach((player) => { player.tell("<status>" + this.name + " has connected.") });
        }
    }

    disconnect(conn) {
        this.connections = this.connections.filter((c) => { return c != conn });
        connectedPlayers.filter((player) => { return player != this; });

        if (this.connections.length <= 0) {
            this.saved_location = this.location;
            this.moveto(Objects[Player.limbo]);
            connectedPlayers.forEach((player) => { player.tell("<status>" + this.name + " has disconnected.") });
        }
    }

    tell(text) {
        if (!text)
            return;
        this.connections.forEach((conn) => { if (conn) conn.send_log(text); });
    }

    tell_msg(msg) {
        this.connections.forEach((conn) => { if (conn) conn.send_json(msg); });
    }

    prompt(id, respond, form) {
        this.connections.forEach((conn) => { if (conn) conn.send_json({ type: 'prompt', id: id, respond: respond, form: form }); });
    }

    acceptable(obj) {
        return !(obj instanceof Being);
    }

    get_view(player) {
        let view = super.get_view(player);
        view.brief = this.format("{this.title} is {this.position} here.");
        if (player == this) {
            view.contents = this.contents.map(function (item) {
                return item.get_view(player);
            });
        }
        return view;
    }

    update_view(section) {
        let msg = { type: 'update' };
        if (!section || section == 'player')
            msg.player = this.get_view(this);
        if (!section || section == 'location')
            msg.location = this.location.get_view(this);
        this.tell_msg(msg);
    }

    update_contents() {
        this.update_view('player');
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this == player) {
            if (this.position != 'standing' || all)
                verbs.push('stand');
            if (this.position != 'sitting' || all)
                verbs.push('sit');

            verbs.push('profile|prompt', 'theme|prompt');
        }
        if (all && player.isWizard)
            verbs.push('teleport', 'examine|object', 'setattr', 'editverb');
        return verbs;
    }

    get_prefs() {
        return {
            audio: false,
            theme: Style.getCSS(this._theme ? this._theme : '/media/default/theme/world.css', 'body'),
        };
    }


    sit(args) {
        this.position = 'sitting';

        args.player.tell("<action>You sit down on the ground.");
        args.player.location.tell_all_but(args.player, this.format("<action>{player.name} sits down on the ground.", args));
        this.update_view();
        this.location.update_contents();
    }

    stand(args) {
        this.position = 'standing';

        args.player.tell("<action>You stand up.");
        args.player.location.tell_all_but(args.player, this.format("<action>{player.name} stands up.", args));
        this.update_view();
        this.location.update_contents();
    }


    teleport(args) {
        // TODO add check to see if args.player == this? and/or allow wizards to teleport other people
        if (!args.dobj)
            args.player.tell("You must provide a valid room id to teleport to");
        else if (!(args.dobj instanceof Room))
            args.player.tell("You can only teleport into a room object");
        else {
            let oldwhere = this.location;
            if (this.moveto(args.dobj)) {
                oldwhere.tell_all_but(args.player, this.format("<action>{this.title} disappears in a flash of smoke.", args));
                this.location.tell_all_but(args.player, this.format("<action>{this.title} appears in a flash of smoke.", args));
                args.player.tell(this.format("<action>You teleport to {this.location.title}", args));
            }
            else
                args.player.tell("<action>You try to teleport but fizzle instead.");
        }
    }

    examine(args) {
        args.player.tell(this.format("{constructor.name}; {name} (#{id}): {title}", args.dobj));
        if (args.dobj.location)
            args.player.tell(this.format("Its location is {location.name} (#{location.id})", args.dobj));
        if (args.dobj.exits)
            args.dobj.exits.forEach(function (exit) {
                args.player.tell(this.format("<indent>{name} (#{id}) to {title} (#{dest.id})", exit));
            }.bind(this));
    }

    setattr(args) {
        let words = args.text.match(/^\s*(\S+?)\s+(\S+?)\s+(.*)$/);
        if (!words)
            return args.player.tell("Usage: /setattr <object> <attribute> <value>");

        let value;
        try {
            value = JSON.parse(words[3]);
        }
        catch (e) {
            value = words[3];
        }

        let item = args.player.find_object(words[1]);
        if (!item)
            args.player.tell("I don't see that object here.");
        item.edit_by(args.player, words[2], value);
        args.player.update_view();
    }

    editverb(args) {
        if (!args.response) {
            if (!this.check_args(args, 'string for/on/of object'))
                args.player.tell("Usage: /editverb <attribute> for <object>");
            else
                args.player.prompt(this.id, 'verb', {
                    label: "Editing " + args.dobjstr + " for #" + args.iobj.id,
                    fields: [
                        { name: 'id', type: 'hidden', value: args.iobj.id },
                        { name: 'verb', type: 'hidden', value: args.dobjstr },
                        { name: 'function', type: 'code', value: args.iobj[args.dobjstr] ? args.iobj[args.dobjstr].toString() : 'function (args) {\n}' },
                    ]
                });
        }
        else {
            console.log(args.response);
            if (!args.response.verb || !args.response.id || args.response.id < 0 || args.response.id >= Objects.length)
                args.player.tell("That doesn't appear to be a valid object you're saving the verb to");
            else
                Objects[args.response.id][args.response.verb] = eval("(" + args.response.function + ")");
        }
    }

    profile(args) {
        console.log("PROFILE", args.response);
        if (args.response.aliases)
            this.aliases = args.response.aliases.split(/\s*,\s*/);
        // TODO set profile picture
        this.update_contents();
    }

    theme(args) {
        console.log("THEME", args.response);
        if (args.response.theme_switch == 'cssfile')
            this._theme = args.response.theme.cssfile;
        else
            this._theme = args.response.theme;
        args.player.tell_msg({ type: 'prefs', prefs: args.player.get_prefs() });
    }

    get_form_for(player, name) {
        switch (name) {
            case 'profile':
                return { label: "Your Profile", fields: [
                    { name: 'picture', label: 'Avatar', type: 'file', filter: '^image', value: this.profile.picture ? this.profile.picture : '' },
                    { name: 'aliases', label: 'Aliases', type: 'text', value: this.aliases ? this.aliases.join(', ') : '' },
                ] };
            case 'theme':
                return { label: "Editing Site Theme", fields: [
                    { name: 'theme', type: 'switch', value: typeof this._theme == 'string' ? 'cssfile' : 'options', options: [
                        { name: 'cssfile', label: 'CSS File', fields: [
                            { name: 'cssfile', type: 'file', filter: 'text/css', value: typeof this._theme == 'string' ? this._theme : '' },
                        ] },
                        { name: 'options', label: 'Options', fields: [
                            { name: 'background', label: 'Background Image', type: 'file', filter: '^image', value: this._theme ? this._theme.background : '' },
                            { name: 'font', label: 'Font', type: 'text', value: this._theme ? this._theme.font : '' },
                            { name: 'box', label: 'Box CSS', type: 'text', value: this._theme ? this._theme.box : '' },
                            { name: 'title', label: 'Title CSS', type: 'text', value: this._theme ? this._theme.title : '' },
                            { name: 'description', label: 'Description CSS', type: 'text', value: this._theme ? this._theme.description : '' },
                        ] },
                    ] },
                ] };
            default:
                return super.get_form_for(player, name);
        }
    }
}

Player.limbo = 18;
Player.lobby = 19;

Player.createNew = function (name, hash, email) {
    let player = new Player();
    player.title = name;
    player.password = hash;
    player.email = email;
    return player.id;
};

Player.find = function (name) {
    name = name.toLowerCase();
    for (let i = 0; i < allPlayers.length; i++) {
        if (allPlayers[i].name.toLowerCase() == name)
            return allPlayers[i];
    }
    return null;
};



class Room extends Thing {
    constructor() {
        super();
        this.exits = [ ];
        this.locked = false;
    }

    tell_all_but(player, text) {
        if (!text)
            return;
        if (!Array.isArray(player))
            player = [ player ];
        this.contents.map(function (obj) {
            if (player.indexOf(obj) == -1)
                obj.tell(text);
        });
    }

    acceptable(obj) {
        return !this.locked;
    }

    get_view(player) {
        let view = super.get_view(player);
        if (this.style)
            view.style = Style.getCSS(this.style, '.viewbox.location');
        if (this.audio)
            view.audio = this.audio;
        view.contents = this.contents.filter((obj) => { return obj != player }).map(function (item) {
            return item.get_view(player);
        });
        view.exits = this.exits.map(function (exit) {
            return exit.get_view(player);
        });
        return view;
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        verbs.push('favorite');
        if (player.isWizard)
            verbs.push('dig', 'addexit', 'rmexit', 'customize');
        if (all)
            verbs.push('look', 'say', 'emote', 'shout', 'go');
        return verbs;
    }

    editable_by(player) {
        let props = super.editable_by(player);
        //if (player.isWizard)
        //    props.push('style|object');
        return props;
    }


    look(args) {
        if (!args.text)
            args.player.update_view('location');
        else if (args.dobj)
            args.player.tell_msg({ type: 'update', details: args.dobj.get_view(args.player) });
        else
            args.player.tell("You don't see that here.");
    }

    say(args) {
        args.player.tell("You say, \"<chat>" + args.text + "</chat>\"");
        this.tell_all_but(args.player, args.player.name + " says, \"<chat>" + args.text + "</chat>\"");
    }

    emote(args) {
        this.tell_all_but(null, "<chat>" + args.player.name + " " + args.text + "</chat>");
    }

    shout(args) {
        let text = args.text.toUpperCase();
        args.player.tell("You shout, \"<shout>" + text + "!</shout>\"");
        this.tell_all_but(args.player, args.player.name + " shouts, \"<shout>" + text + "!</shout>\"");
    }

    go(args) {
        let exit;

        if (args.dobj)
            exit = this.exits.find((exit) => { return exit.dest == args.dobj; });
        else {
            let name = args.text.toLowerCase();
            exit = this.exits.find((exit) => { return exit.name.toLowerCase().substr(0, name.length) == name; });
        }

        if (exit)
            exit.invoke(args.player);
        else
            args.player.tell("You can't go that way.");
    }


    link_rooms(direction, room, noReturn) {
        let opposite = !noReturn ? Exit.opposite_direction(direction) : null;
        if (this.exits.some((exit) => { return exit.name == direction }) || (opposite && room.exits.some((exit) => { return exit.name == opposite })))
            return false;

        let exit = new Exit();
        exit.name = direction;
        exit.source = this;
        exit.dest = room;
        this.exits.push(exit);

        if (opposite) {
            let rexit = new Exit();
            rexit.name = opposite;
            rexit.source = room;
            rexit.dest = this;
            room.exits.push(rexit);
        }

        return true;
    }

    dig(args) {
        if ((!args.iobj && !args.iobjstr) || !args.dobjstr || (args.prep && args.prep != 'to')) {
            args.player.tell("Usage: /dig <direction> to <room>");
            return;
        }

        let room = args.iobj;
        if (!room) {
            room = new Room();
            room.name = args.iobjstr;
            args.player.tell(this.format("new room created: {name} (#{id})", room));
        }

        if (!(room instanceof Room))
            args.player.tell("That isn't a room");
        else if (!this.link_rooms(args.dobjstr, room))
            args.player.tell("That direction is already in use by one of the rooms");
        else
            this.update_contents();
    }

    addexit(args) {
        if (!this.check_args(args, 'string to object'))
            return args.player.tell("Usage: /addexit <direction> to <room>");

        if (!(args.iobj instanceof Room))
            args.player.tell("That isn't a room");
        else if (!this.link_rooms(args.dobjstr, args.iobj, true))
            args.player.tell("That direction is already in use by one of the rooms");
        else
            this.update_contents();
    }

    rmexit(args) {
        let direction = args.text.toLowerCase();
        let before = this.exits.length;
        this.exits = this.exits.filter(function (exit) {
            if (exit.name == direction) {
                exit.recycle();
                return false;
            }
            else
                return true;
            //return exit.name != direction;
        });
        args.player.tell((before - this.exits.length) + " exits removed");
        this.update_contents();
    }

    customize(args) {
        if (!this.check_form(args, 'customize'))
            return;
        this.style = args.response;
        this.update_contents();
    }

    get_form_for(player, name) {
        switch (name) {
            case 'customize':
                return { label: "Customize style for \"" + this.title + "\"", fields: [
                    { name: 'background', label: 'Background Image', type: 'file', filter: '^image', value: this.style ? this.style.background : '' },
                    { name: 'font', label: 'Font', type: 'text', value: this.style ? this.style.font : '' },
                    { name: 'box', label: 'Box CSS', type: 'text', value: this.style ? this.style.box : '' },
                    { name: 'title', label: 'Title CSS', type: 'text', value: this.style ? this.style.title : '' },
                    { name: 'description', label: 'Description CSS', type: 'text', value: this.style ? this.style.description : '' },
                ] };
            default:
                return super.get_form_for(player, name);
        }
    }
}

class Exit extends Thing {
    constructor() {
        super();
        this.source = null;
        this.dest = null;
        this.hasDoor = false;
        this.isOpen = true;
    }

    get title() { return this.dest.title; }
    set title(v) { /* do nothing */ }

    is_blocked(player) {
        return this.hasDoor && !this.isOpen;
    }

    invoke(player) {
        if (!player.location == this.source)
            return;

        if (this.is_blocked(player))
            player.tell(this.format(this.msg_blocked_you));
        else if (player.moveto(this.dest) && player.location == this.dest) {
            let opposite = this.dest.exits.find((exit) => { return exit.name == this.name });

            this.source.tell_all_but(player, this.format(this.msg_leave_others, { player: player, direction: this.name }));
            player.tell(this.format(this.msg_success_you, { direction: this.name, dest: this.dest }));
            this.dest.tell_all_but(player, this.format(this.msg_arrive_others, { player: player, direction: opposite ? opposite : 'somewhere' }));
        }
        else {
            player.tell(this.format(this.msg_fail_you));
        }
    }


    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.hasDoor)
            verbs.push(this.isOpen ? 'close' : 'open');
        if (player.isWizard)
            verbs.push('remove');
        return verbs;
    }

    remove(args) {
        args.text = this.name;
        this.source.rmexit(args);
    }

    open(args) {

    }

    close(args) {

    }


    static opposite_direction(direction) {
        switch (direction) {
            case 'north': return 'south';
            case 'south': return 'north';
            case 'west': return 'east';
            case 'east': return 'west';
            case 'up': return 'down';
            case 'down': return 'up';
            default: return false;
        }
    }
}
Exit.prototype.msg_success_you      = "You go {direction} to {dest.title}";
Exit.prototype.msg_fail_you         = "Your way is blocked.";
Exit.prototype.msg_blocked_you      = "The door is closed.";
Exit.prototype.msg_leave_others     = "{player.title} leaves {direction}";
Exit.prototype.msg_arrive_others    = "{player.title} enters from the {direction}";


class Item extends Thing {

    get title() { return Utils.properName(this.name).capitalizeAll(); }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player || all)
            verbs.push('drop', 'give|this to object');
        if (this.location == player.location || all)
            verbs.push('pickup/take/get');
        return verbs;
    }

    pickup(args) {
        if (this.location == args.player.location && this.moveto(args.player)) {
            args.player.tell(this.format(this.msg_take_success_you, args));
            args.player.location.tell_all_but(args.player, this.format(this.msg_take_success_others, args));
        }
        else {
            args.player.tell(this.format(this.msg_take_fail_you, args));
            args.player.location.tell_all_but(args.player, this.format(this.msg_take_fail_others, args));
        }
    }

    drop(args) {
        if (this.location == args.player && this.moveto(args.player.location)) {
            args.player.tell(this.format(this.msg_drop_success_you, args));
            args.player.location.tell_all_but(args.player, this.format(this.msg_drop_success_others, args));
        }
        else {
            args.player.tell(this.format(this.msg_drop_fail_you, args));
            args.player.location.tell_all_but(args.player, this.format(this.msg_drop_fail_others, args));
        }
    }

    give(args) {
        if (args.prep != 'to')
            args.player.tell("<action>You have to give something *to* someone.");
        else if (!args.dobj || !args.iobj)
            args.player.tell("<action>I don't see that here.");
        else if (!args.iobj.acceptable(this))
            args.player.tell(this.format("<action>{iobj.name} doesn't want {this.title}.", args));
        else if (this.location != args.player || args.iobj.location != args.player.location || !this.moveto(args.iobj))
            args.player.tell(this.format("<action>You try to give {this.title} to {iobj.name} but fail somehow.", args));
        else {
            args.player.tell(this.format("<action>You give {this.title} to {iobj.name}.", args));
            args.iobj.tell(this.format("<action>{player.name} give you {this.title}.", args));
            args.player.location.tell_all_but([args.player, args.iobj], this.format("<action>{player.name} gives {this.title} to {iobj.name}.", args));
        }
    }
}
Item.prototype.msg_take_success_you     = "<action>You pick up {this.title}";
Item.prototype.msg_take_success_others  = "<action>{player.name} picks up {this.title}";
Item.prototype.msg_take_fail_you        = "<action>You can't pick that up";
Item.prototype.msg_take_fail_others     = "";
Item.prototype.msg_drop_success_you     = "<action>You drop {this.title}";
Item.prototype.msg_drop_success_others  = "<action>{player.name} drops {this.title}";
Item.prototype.msg_drop_fail_you        = "<action>You can't seem to drop {this.title} here.";
Item.prototype.msg_drop_fail_others     = "<action>{player.name} tries to drop {this.title}, but fails.";


class UseableItem extends Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('use');
        return verbs;
    }

    use(args) {
        args.player.tell(this.format(this.msg_use_you, args));
        args.player.location.tell_all_but(args.player, this.format(this.msg_use_others, args));
    }
}

class WearableItem extends Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('wear');
        return verbs;
    }

    wear(args) {

    }
}

class WeildableItem extends Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('weild');
        return verbs;
    }

    weild(args) {

    }
}

class EdibleItem extends Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('eat');
        return verbs;
    }

    eat(args) {

    }
}

class DrinkableItem extends Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('drink');
        return verbs;
    }

    drink(args) {

    }
}


//
// Object Database
//
Objects = [
    Root,
    Thing,
    Being,
    Player,
    Room,
    Exit,
    Item,
    UseableItem,
];

Root.reservedObjects = 18;
Objects.forEach((obj, index) => { obj.id = index; });               // Assign the id to each of these, since they wont have one
Objects = Objects.concat(Array(Root.reservedObjects - Objects.length).fill(null));    // Reserve space for future class objects


//
// Initialize Objects
//
function initTestObjects() {
    let limbo = new Room();
    limbo.name = "Limbo";
    limbo.description = "You are floating in a void of blackness.  You cannot make out anything.";

    let lobby = new Room();
    lobby.name = "The Lobby";
    lobby.description = "You are in an empty hotel lobby.  There isn't anything here yet";

    let wizard = new Player();
    wizard.isWizard = true;
    wizard.title = "Wizzy the Wizard";
    wizard.description = "A short person with a long white beard and a pointy blue hat.";
    wizard.password = "$2a$10$Xgg6g4inK/qzcPUtPC40x..vNyDw7z3R/tveviQmquFEi1PnbeIlu";

    let lowely = new Player();
    lowely.title = "Lowely Worm";
    lowely.description = "An anthropormorphic worm with a green hat, and a single big brown boot.";
    lowely.password = "$2a$10$Xgg6g4inK/qzcPUtPC40x..vNyDw7z3R/tveviQmquFEi1PnbeIlu";

    let coatcheck = new Room();
    coatcheck.name = "The Coat Check";
    coatcheck.description = "There is a counter here for checking your coats and belongings, but no one as behind the counter.";

    lobby.link_rooms('west', coatcheck);

    let doohickey = new Item();
    doohickey.name = "Doohickey";
    doohickey.description = "It's a general purpose tool for anything you want.";
    doohickey.moveto(wizard);

    let partybutton = new UseableItem();
    partybutton.name = "The Party Button";
    partybutton.description = "It's a small box with a big red button labelled \"Party\".";
    partybutton.msg_use_you = "You press the party button.  <b><red>It explodes into a burst of lights and music;</b> <green>a disc ball decends from the ceiling and everybody starts partying.";
    partybutton.msg_use_others = "{player.title} pulls out a big button and presses it.  <b><red>It explodes into a burst of lights and music;</b> <green>a disc ball decends from the ceiling and everybody starts partying.";
    partybutton.moveto(wizard);

    let ducky = new Being();
    ducky.name = "Ducky";
    ducky.description = "An small duck is quacking and waddling around here.";
    ducky.moveto(lobby);
    ducky.onLoad = function () { this.annoy() };
    ducky.annoy = function (args) {
        setTimeout(function () {
            if (this.location)
                this.location.say({ player: this, text: "Quack ".repeat(1 + Math.floor(Math.random() * 3)).trim() });
            this.annoy();
        }.bind(this), 30000 + Math.random() * 30000);
    };
    ducky.annoy();
}
//initTestObjects();


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


const saveObject = function (obj) {
    console.log("Saving object " + obj.id);
    try {
        fs.writeFileSync('data/objects/'+obj.id+'.json', serializeObject(obj), 'utf8');
    }
    catch (e) {
        console.log(e.stack);
    }
};

const loadObject = function (id, callback) {
    console.log("Loading object " + id);
    let data = JSON.parse(fs.readFileSync('data/objects/'+id+'.json', 'utf8'));

    //let oid = parseInt(data['id']);
    let tid = parseInt(data['$type']);
    if (tid < 0 || tid >= Objects.reservedObjects)
        throw "Unable to load object with a non-standard type id " + tid;

    let obj;
    if (Objects[id])
        obj = Objects[id];
    else {
        obj = new Objects[tid]();
        if (Objects.pop() != obj)
            throw "Error during load: last object doesn't match this object";
        Objects[id] = obj;
    }

    for (let k in data) {
        obj[k] = parseData(data[k]);
    }
    obj.id = id;
    //obj.onLoad();

    return obj;
};

const serializeObject = function (obj) {
    obj['$type'] = obj.constructor.id;
    return JSON.stringify(obj, function (k, v) {
        if (v == obj)
            return v;
        else if (v instanceof Root)
            return { $ref: v.id };
        else if (typeof v == 'function')
            return v.toString();
        else if (typeof v == 'object' && v && v['$nosave'])
            return null;
        else
            return v;
    }, 2);
};

const parseData = function (data) {
    if (data === null)
        return data;
    else if (Array.isArray(data))
        return data.map(parseData);
    else if (typeof data === 'string' && data.match(/^function /))
        return eval("(" + data + ")");
    else if (typeof data === 'object') {
        if (data['$ref']) {
            if (data['$ref'] < Objects.length && Objects[data['$ref']])
                return Objects[data['$ref']];
            else
                return loadObject(data['$ref']);
        }
        else {
            let obj = { };
            for (let k in data) {
                obj[k] = parseData(data[k]);
            }
            return obj;
        }
    }
    else
        return data;
}

const loadAllObjects = function () {
    let r = /^(\d+)\.json$/;
    let files = fs.readdirSync('data/objects', 'utf8');
    files.forEach(function (filename) {
        let m = filename.match(r);
        if (m && m[1] >= Root.reservedObjects && !Objects[m[1]])     // TODO you shouldn't reload objects that are already loaded, but then the default objects like lobby wont get updated...
            loadObject(parseInt(m[1]));
    });

    Objects.forEach(function (obj) {
        if (obj && obj.onLoad)
            obj.onLoad();
    });
};

const saveAllObjects = function () {
    for (let i = Root.reservedObjects; i < Objects.length; i++) {
        if (Objects[i])
            saveObject(Objects[i]);
    }
};

const saveObjectsAsOne = function () {
    let output = '';
    for (let i = Root.reservedObjects; i < Objects.length; i++) {
        if (Objects[i])
            output += ",\n" + serializeObject(Objects[i]);
    }
    output = '[' + output.slice(1) + '\n]';
    try {
        fs.writeFileSync('data/objects/world.json', output, 'utf8');
    }
    catch (e) {
        console.log(e.stack);
    }
}

//saveAllObjects();
loadAllObjects();
//saveObjectsAsOne();

process.on('exit', function () {
    saveAllObjects();
});

process.on('SIGINT', function () {
    process.exit();
});

process.on('SIGUSR2', function () {
    process.exit();
});

const savePeriodically = function () {
    setTimeout(function () {
        saveAllObjects();
        savePeriodically();
    }, 600000);
};
savePeriodically();


module.exports = {
    Objects,
    Root,
    Thing,
    Being,
    Player,
    Room,
    Exit,
    Item,

    saveAllObjects,
};

