
'use strict';

const fs = require('fs');

var Objects = [ ];


class Root {
    constructor() {
        Objects.push(this);
        this.id = Objects.length - 1;
        this.name = "unnamed object";
        this.location = null;
        this.contents = [];
    }

    recycle() {
        // TODO check to make sure there are no references?
        Objects[this.id] = null;
        fs.unlinkSync('objects/'+this.id+'.json');
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
            else
                return value;
        });
    }

    tell(text) {
        // do nothing
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
        return true;
    }

    acceptable(obj) {
        return false;
    }

    update_contents() {
        this.contents.map(function (item) {
            if (item.update_view)
                item.update_view('location');
        });
    }

    verbs_for(player, all) {
        return [];
    }

    can_do(player, verb) {
        let verbs = this.verbs_for(player, true);
        return verbs.find((i) => { return i.split('|')[0] == verb; });
    }

    editable_by(player) {
        return [];
    }
}

class Thing extends Root {
    constructor() {
        super();
        this.title = "A nondiscript object";
        this.description = "You aren't sure what it is.";
    }

    match_object(name) {
        name = name.toLowerCase();

        let m;
        if (m = name.match(/^#(\d+)$/)) {
            if (m[1] < 0 || m[1] >= Objects.length)
                return null;
            return Objects[m[1]];
        }

        for (let i = 0; i < this.contents.length; i++) {
            if (this.contents[i].name.toLowerCase().substr(0, name.length) == name)
                return this.contents[i];
        }

        for (let i = 0; i < this.location.contents.length; i++) {
            if (this.location.contents[i].name.toLowerCase().substr(0, name.length) == name)
                return this.location.contents[i];
        }
        return null;
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
            props.push('name', 'title', 'description');
        return props;
    }
}

class Being extends Thing {

    acceptable(obj) {
        return false;
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        verbs.push('hug');
        return verbs;
    }

    hug(args) {
        if (this == args.player) {
            args.player.tell("<action>You hug yourself.");
            args.player.location.tell_all_but(args.player, "<action>" + args.player.name + " hugs themself.");
        }
        else {
            args.player.tell("<action>You hug " + this.title);
            this.tell("<action>" + args.player.title + " hugs you.");
            args.player.location.tell_all_but([ this, args.player ], "<action>" + args.player.name + " hugs " + this.title);
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
        this.moveto(limbo);

        this.isWizard = false;
        this.position = 'standing';
    }

    onLoad() {
        super.onLoad();
        this.connections = [ ];
        if (this.location != limbo) {
            this.saved_location = this.location;
            this.moveto(limbo);
        }
    }

    connect(conn) {
        this.connections.push(conn);
        if (connectedPlayers.indexOf(this) == -1)
            connectedPlayers.push(this);

        if (this.connections.length == 1) {
            this.moveto(this.saved_location ? this.saved_location : lobby);
            connectedPlayers.forEach((player) => { player.tell("<status>" + this.name + " has connected.") });
        }
    }

    disconnect(conn) {
        this.connections = this.connections.filter((c) => { return c != conn });
        connectedPlayers.filter((player) => { return player != this; });

        if (this.connections.length <= 0) {
            this.saved_location = this.location;
            this.moveto(limbo);
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

    acceptable(obj) {
        return !(obj instanceof Being);
    }

    get_view(player) {
        let view = super.get_view(player);
        view.pose = this.title + " is " + this.position + " here.";
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
        }
        if (all && player.isWizard)
            verbs.push('teleport', 'examine');
        return verbs;
    }


    sit(args) {
        this.position = 'sitting';

        args.player.tell("<action>You sit down on the ground.");
        args.player.location.tell_all_but(args.player, "<action>" + args.player.name + " sits down on the ground.");
        this.update_view();
    }

    stand(args) {
        this.position = 'standing';

        args.player.tell("<action>You stand up.");
        args.player.location.tell_all_but(args.player, "<action>" + args.player.name + " stands up.");
        this.update_view();
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
                oldwhere.tell_all_but(args.player, "<action>" + this.title + " disappears in a flash of smoke.");
                this.location.tell_all_but(args.player, "<action>" + this.title + " appears in a flash of smoke.");
                args.player.tell("<action>You teleport to " + this.location.title);
            }
            else
                args.player.tell("<action>You try to teleport but fizzle instead.");
        }
    }

    examine(args) {
        if (!args.dobj)
            args.player.tell("I don't see that here.");
        else {
            args.player.tell(args.dobj.constructor.name + "; " + args.dobj.name + " (#" + args.dobj.id + "): " + args.dobj.title);
            if (args.dobj.location)
                args.player.tell("Its location is " + args.dobj.location.name + " (#" + args.dobj.location.id + ")");
        }
    }
}


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

    link_rooms(direction, room) {
        let opposite = Exit.opposite_direction(direction);
        if (room.exits.some((exit) => { return exit.name == direction }) || room.exits.some((exit) => { return exit.name == opposite }))
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


    get_view(player) {
        let view = super.get_view(player);
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
            verbs.push('dig', 'addexit', 'rmexit');
        if (all)
            verbs.push('look', 'say', 'emote', 'shout', 'go');
        return verbs;
    }


    look(args) {
        if (!args.text) {
            args.player.update_view('location');
        }
        else {
            if (args.dobj) {
                args.player.tell_msg({
                    type: 'update',
                    section: 'details',
                    details: args.dobj.get_view(args.player),
                });
            }
            else {
                args.player.tell("You don't see that here.");
            }
        }
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
        let name = args.text.toLowerCase();
        for (let i = 0; i < this.exits.length; i++) {
            if (this.exits[i].name.toLowerCase().substr(0, name.length) == name) {
                this.exits[i].invoke(args.player);
                return;
            }
        }
        args.player.tell("You can't go that way.");
    }

    dig(args) {
        if ((!args.iobj && !args.iobjstr) || !args.dobjstr || (args.prep && args.prep != 'to')) {
            console.log(args);
            args.player.tell("Usage: /dig <direction> to <room>");
            return;
        }

        let room = args.iobj;
        if (!room) {
            room = new Room();
            room.title = args.iobjstr;
            args.player.tell("new room created: " + room.title + " (#" + room.id + ")");
        }

        if (!(room instanceof Room))
            args.player.tell("That isn't a room");
        else if (!this.link_rooms(args.dobjstr.toLowerCase(), room))
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
}

class Exit extends Thing {
    constructor() {
        super();
        this.source = null;
        this.dest = null;
        this.hasDoor = false;
    }

    get title() { return this.dest.title; }
    set title(v) { /* do nothing */ }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.hasDoor)
            verbs.push('open');
        if (player.isWizard)
            verbs.push('remove');
        return verbs;
    }

    invoke(player) {
        if (!player.location == this.source)
            return;

        if (player.moveto(this.dest) && player.location == this.dest) {
            this.source.tell_all_but(player, this.format(this.msg_leave_others, { player: player, direction: this.name }));

            player.tell(this.format(this.msg_success_you, { direction: this.name, dest: this.dest }));
            // TODO this isn't right... it should find the corresponding exit via the this.dest field
            this.dest.tell_all_but(player, this.format(this.msg_arrive_others, { player: player, direction: Exit.opposite_direction(this.name) }));
        }
        else {
            player.tell(this.format(this.msg_fail_you));
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

    remove(args) {
        args.text = this.name;
        this.source.rmexit(args);
    }
}
Exit.prototype.msg_success_you      = "You go {direction} to {dest.title}";
Exit.prototype.msg_fail_you         = "You way is blocked.";
Exit.prototype.msg_leave_others     = "{player.title} leaves {direction}";
Exit.prototype.msg_arrive_others    = "{player.title} enters from the {direction}";


//var Item = function () {
//    this.name = '';
//}; 
//Item.prototype = {
//Object.setPrototypeOf(Item.prototype, new Thing);

class Item extends Thing {

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player || all)
            verbs.push('drop', 'give|t');
        if (this.location == player.location || all)
            verbs.push('pickup');
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
            args.player.tell(this.format("<action>You give {this.title} to {iobj.title}.", args));
            args.iobj.tell(this.format("<action>{player.title} give you {this.title}.", args));
            args.player.location.tell_all_but([args.player, args.iobj], this.format("<action>{player.title} gives {this.title} to {iobj.title}.", args));
        }
    }
}
Item.prototype.msg_take_success_you     = "<action>You pick up {this.title}";
Item.prototype.msg_take_success_others  = "<action>{player.title} picks up {this.title}";
Item.prototype.msg_take_fail_you        = "<action>You can't pick that up";
Item.prototype.msg_take_fail_others     = "";
Item.prototype.msg_drop_success_you     = "<action>You drop {this.title}";
Item.prototype.msg_drop_success_others  = "<action>{player.title} drops {this.title}";
Item.prototype.msg_drop_fail_you        = "<action>You can't seem to drop {this.title} here.";
Item.prototype.msg_drop_fail_others     = "<action>{player.title} tries to drop {this.title}, but fails.";


class UseableItem extends Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('use');
        return verbs;
    }

    use(args) {
        let partymsg = "<b><red>It explodes into a burst of lights and music;</b> <green>a disc ball decends from the ceiling and everybody starts partying.";
        args.player.tell("You press the party button.  " + partymsg);
        args.player.location.tell_all_but(args.player, args.player.name + " pulls out a big button and presses it.  " + partymsg);
    }
}

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

Objects.forEach((obj, index) => { obj.id = index; });


var limbo = new Room();
limbo.name = "limbo";
limbo.title = "Limbo";
limbo.description = "You are floating in a void of blackness.  You cannot make out anything.";

var firstSaveableObject = Objects.length;

var lobby = new Room();
lobby.name = "lobby";
lobby.title = "The Lobby";
lobby.description = "You are in an empty hotel lobby.  There isn't anything here yet";

let wizard = new Player();
wizard.isWizard = true;
wizard.name = "Wizard";
wizard.title = "Wizzy the Wizard";
wizard.description = "A short person with a long white beard and a pointy blue hat.";
wizard.password = "$2a$10$Xgg6g4inK/qzcPUtPC40x..vNyDw7z3R/tveviQmquFEi1PnbeIlu";


function initTestObjects() {
    let lowely = new Player();
    lowely.name = "Lowely";
    lowely.title = "Lowely Worm";
    lowely.description = "An anthropormorphic worm with a green hat, and a single big brown boot.";
    lowely.password = "$2a$10$Xgg6g4inK/qzcPUtPC40x..vNyDw7z3R/tveviQmquFEi1PnbeIlu";

    let coatcheck = new Room();
    coatcheck.name = "coatcheck";
    coatcheck.title = "The Coat Check";
    coatcheck.description = "There is a counter here for checking your coats and belongings, but no one as behind the counter.";

    lobby.link_rooms('west', coatcheck);

    let doohickey = new Item();
    doohickey.name = "Doohickey";
    doohickey.title = "A Doohickey";
    doohickey.description = "It's a general purpose tool for anything you want.";
    doohickey.moveto(wizard);

    let partybutton = new UseableItem();
    partybutton.name = "partybutton";
    partybutton.title = "The Party Button";
    partybutton.description = "It's a small box with a big red button labelled \"Party\".";
    partybutton.moveto(wizard);

    let ducky = new Being();
    ducky.name = "Ducky";
    ducky.title = "A Ducky";
    ducky.description = "An small duck is quacking and waddling around here.";
    ducky.moveto(lobby);
    ducky.onLoad = function () { this.annoy() };
    ducky.annoy = function (args) {
        setTimeout(function () {
            ducky.location.say({ player: ducky, text: "Quack ".repeat(1 + Math.floor(Math.random() * 3)).trim() });
            ducky.annoy();
        }, 30000 + Math.random() * 30000);
    };
    ducky.annoy();
}
initTestObjects();


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

/*
limbo.test = "object:33";
console.log(JSON.parse(serializeObject(limbo), function (k, v) {
    if (typeof v === 'string') {
        let m = v.match(/^object\:(\d+)$/);
        if (!m)
            return v;
        // TODO this wouldn't work because you can't change the type of the object later
        if (!Objects[m[1]])
            Objects[m[1]] = { };
        return Objects[m[1]];
    }
    return v;
}));
*/

const saveObject = function (obj) {
    console.log("Saving object " + obj.id);
    try {
        fs.writeFileSync('objects/'+obj.id+'.json', serializeObject(obj), 'utf8');
    }
    catch (e) {
        console.log(e.stack);
    }
};

const loadObject = function (id, callback) {
    console.log("Loading object " + id);
    let data = JSON.parse(fs.readFileSync('objects/'+id+'.json', 'utf8'));

    //let oid = parseInt(data['id']);
    let tid = parseInt(data['$type']);
    if (tid < 0 || tid >= firstSaveableObject)
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
    });
};

const parseData = function (data) {
    if (data === null)
        return data;
    else if (Array.isArray(data))
        return data.map(parseData);
    else if (typeof data === 'string' && data.match(/^function /))
        return eval("(function(){ return " + data + ";})");
    else if (typeof data === 'object') {
        if (data['$ref']) {
            if (data['$ref'] < Objects.length && Objects[data['$ref']])
                return Objects[data['$ref']];
            else
                return loadObject(data['$ref']);
        }
        else {
            console.log("*** Parsing Plain Object", data);
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
    let files = fs.readdirSync('objects', 'utf8');
    files.forEach(function (filename) {
        let m = filename.match(r);
        if (m && m[1] >= firstSaveableObject) // && !Objects[m[1]])     // TODO you shouldn't reload objects that are already loaded, but then the default objects like lobby wont get updated...
            loadObject(parseInt(m[1]));
    });

    Objects.forEach(function (obj) {
        if (obj.onLoad)
            obj.onLoad();
    });
};

const saveAllObjects = function () {
    for (let i = firstSaveableObject; i < Objects.length; i++) {
        if (Objects[i])
            saveObject(Objects[i]);
    }
};

//saveAllObjects();
loadAllObjects();

process.on('exit', function () {
    saveAllObjects();
});

process.on('SIGINT', function () {
    process.exit();
});

process.on('SIGUSR2', function () {
    process.exit();
});


const createNewPlayer = function (name, hash, email) {
    let player = new Player();
    player.name = name;
    player.title = name;
    player.password = hash;
    player.email = email;
    return player.id;
};

const findPlayer = function (name) {
    name = name.toLowerCase();
    for (let i = 0; i < allPlayers.length; i++) {
        if (allPlayers[i].name.toLowerCase() == name)
            return allPlayers[i];
    }
    return null;
};


module.exports = {
    Objects,
    Root,
    Thing,
    Being,
    Player,
    Room,
    Exit,
    Item,
    limbo,
    lobby,
    wizard,

    saveAllObjects,
    createNewPlayer,
    findPlayer,
};

