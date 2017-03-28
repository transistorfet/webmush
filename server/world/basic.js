
'use strict';

const Style = require('../../lib/style');
const Utils = require('./utils');

const DB = require('./db');
const Root = require('./root');


class Thing extends Root {
    get_view(player) {
        let view = super.get_view(player);
        view.description = this.description;
        if (this.icon)
            view.icon = this.icon;
        return view;
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this == player || player.isWizard)
            verbs.push('icon|prompt');
        return verbs;
    }

    editable_by(player) {
        let props = super.editable_by(player);
        if (player.isWizard || this == player)
            props.push('description');
        return props;
    }

    icon(args) {
        this.icon = args.response.icon;
        this.location.update_contents();
    }

    get_form_for(player, name) {
        switch (name) {
            case 'icon':
                return { label: "Set Icon", fields: [
                    { name: 'icon', type: 'file', filter: '^image', value: this.icon ? this.icon : '' },
                ] };
            default:
                return super.get_form_for(player, name);
        }
    }

    /*
    icon: new Verb({
        pattern: 'icon|prompt',
        perms: (player) => { return this == player || player.isWizard },
        form: Form.create('Set Icon', [ Form.File('icon', '^image', this.icon ? this.icon : '') ]),
        do: function (args) {
            this.icon = args.response.icon;
            this.location.update_contents();
        },
        help:   `Set the icon for this object`,
    });
    */
}
Thing.prototype.description = "You aren't sure what it is.";


class Being extends Thing {
    constructor(options) {
        super(options);
        this.canfollow = false;
        this.following = null;
    }

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

        if (this.canfollow) {
            if (player.following == this)
                verbs.push('unfollow|this');
            else
                verbs.push('follow|this');
        }

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

    follow(args) {
        if (!this.canfollow)
            args.player.tell(this.format("You can't follow {this.name}.", args));
        else {
            args.player.following = this;
            this.tell(this.format("{player.name} is now following you.", args));
            args.player.tell(this.format("You are now following {this.name}.", args));
            args.player.update_view('location');
        }
    }

    unfollow(args) {
        if (args.player.following)
            args.player.following.tell(this.format("{player.name} is no longer following you.", args));
        args.player.tell(this.format("You are no longer following anyone.", args));
        args.player.following = null;
        args.player.update_view('location');
    }
}


class Player extends Being {
    constructor(options) {
        super(options);
        Player.allPlayers.push(this);
        this.connections = [ ];
        this.saved_location = null;
        this.moveto(DB.get_object(Player.limbo));

        this.isWizard = false;
        this.position = 'standing';
        this.canfollow = true;
    }

    onLoad() {
        super.onLoad();
        this.connections = [ ];
        if (this.location != DB.get_object(Player.limbo)) {
            this.saved_location = this.location;
            this.moveto(DB.get_object(Player.limbo));
        }
    }

    connect(conn) {
        this.connections.push(conn);
        if (Player.connectedPlayers.indexOf(this) == -1)
            Player.connectedPlayers.push(this);

        if (this.connections.length == 1) {
            this.moveto(this.saved_location ? this.saved_location : DB.get_object(Player.lobby));
            if (this.location == DB.get_object(Player.limbo))
                this.moveto(DB.get_object(Player.lobby));
            Player.connectedPlayers.forEach((player) => { player.tell("<status>" + this.name + " has connected.") });
        }
    }

    disconnect(conn) {
        this.connections = this.connections.filter((c) => { return c != conn });
        Player.connectedPlayers.filter((player) => { return player != this; });

        if (this.connections.length <= 0) {
            this.saved_location = this.location;
            this.moveto(DB.get_object(Player.limbo));
            Player.connectedPlayers.forEach((player) => { player.tell("<status>" + this.name + " has disconnected.") });
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
        if (!section || section.match(/(^|,)player(,|$)/))
            msg.player = this.get_view(this);
        if (this.body && (!section || section.match(/(^|,)body(,|$)/)))
            msg.body = this.body.get_view(this);
        if (!section || section.match(/(^|,)location(,|$)/))
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
            verbs.push('teleport', 'examine|object', 'getattr', 'setattr', 'editverb');
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

    getattr(args) {
        let words = args.text.match(/^\s*(\S+?)\s+(\S+?)$/);
        if (!words)
            return args.player.tell("Usage: /getattr <object> <attribute>");

        let item = args.player.find_object(words[1]);
        if (!item)
            args.player.tell("I don't see that object here.");
        let value = item[words[2]];
        if (typeof value == 'undefined')
            value = words[2] + " is undefined";
        else if (typeof value == 'function')
            value = value.toString();
        else if (typeof value != 'string')
            value = JSON.stringify(value);
        args.player.tell(value);
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
                args.player.prompt(this.id, 'editverb', {
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
            let obj = DB.get_object(args.response.id);
            if (!args.response.verb || !obj)
                args.player.tell("That doesn't appear to be a valid object you're saving the verb to");
            else
                obj[args.response.verb] = eval("(" + args.response.function + ")");
        }
    }

    profile(args) {
        console.log("PROFILE", args.response);
        if (args.response.aliases)
            this.aliases = args.response.aliases.split(/\s*,\s*/);
        this.icon = args.response.icon;
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
            default:
                return super.get_form_for(player, name);
        }
    }

    static create_new(name, hash, email) {
        let player = new Player();
        player.title = name;
        player.password = hash;
        player.email = email;
        return player.id;
    }

    static find(name) {
        name = name.toLowerCase();
        for (let i = 0; i < Player.allPlayers.length; i++) {
            if (Player.allPlayers[i].name.toLowerCase() == name)
                return Player.allPlayers[i];
        }
        return null;
    }
}

Player.limbo = DB.reservedObjects;
Player.lobby = DB.reservedObjects + 1;
Player.connectedPlayers = [ ];
Player.allPlayers = [ ];

class Room extends Thing {
    constructor(options) {
        super(options);
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
            verbs.push('look', 'say', 'emote', 'shout/yell', 'go');
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
            default:
                return super.get_form_for(player, name);
        }
    }
}

class Exit extends Thing {
    constructor(options) {
        super(options);
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

        if (this.is_blocked(player))    // TODO || this.source.is_blocked(player) || player.is_blocked(player)      // so you can only allow players to leave if they aren't fighting and they aren't sitting
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
            verbs.push('remove', 'up', 'down');
        return verbs;
    }

    open(args) {

    }

    close(args) {

    }


    remove(args) {
        if (!this.check_form(args, 'remove', { label: this.format("Are you sure you'd like to remove the exit {this.name} #({this.id})?"), submit: 'yes', cancel: 'no' }))
            return;
        args.text = this.name;
        this.source.rmexit(args);
    }

    up(args) {
        let i = this.source.exits.indexOf(this);
        if (i > 0) {
            this.source.exits.splice(i - 1, 0, this.source.exits.splice(i, 1).shift());
            this.source.update_contents();
        }
    }

    down(args) {
        let i = this.source.exits.indexOf(this);
        if (i >= 0 && i < this.source.exits.length - 1) {
            this.source.exits.splice(i + 1, 0, this.source.exits.splice(i, 1).shift());
            this.source.update_contents();
        }
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

 
module.exports = {
    Thing,
    Being,
    Player,
    Room,
    Exit,
    Item,
    UseableItem,
};

