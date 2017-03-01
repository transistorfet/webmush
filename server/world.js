
'use strict';


//let Objects = [ ];
// TODO how do you get the classes to be added

class Root {
    constructor() {
        Objects.push(this);
        this.id = Objects.length - 1;
        this.name = "unnamed object";
        this.location = null;
        this.contents = [];
    }

    format(text, args) {
        let self = this;
        return text.replace(/{([\w.]+)}/g, function(match, name) { 
            console.log("M", match, name);
            let parts = name.split('.');
            let value = undefined;
            for (let i = 0; i < parts.length; i++) {
                if (parts[i] == 'this')
                    value = self;
                else if (!value && typeof args[parts[i]] != 'undefined')
                    value = args[parts[i]];
                else if (value && typeof value[parts[i]] != 'undefined')
                    value = value[parts[i]];
                else
                    return match;
            }
            return value;
        });
    }

    tell(text) {
        // do nothing
    }

    moveto(location) {
        if (!location)
            return;
        // TODO check if can leave current location
        // TODO check if can enter new location
        if (this.location)
            this.location.contents = this.location.contents.filter((item) => { return item != this });
        location.contents.push(this);
        this.location = location;
    }

    acceptable(obj) {
        return false;
    }

    verbs_for(player, all) {
        return [];
    }

    can_do(player, verb) {
        let verbs = this.verbs_for(player, true);
        return verbs.find((i) => { return i.split('|')[0] == verb; });
    }
}

class Thing extends Root {
    constructor() {
        super();
        this.title = "A nondiscript object";
        this.description = "You aren't sure what it is.";
    }

    match_object(name) {
        for (let i = 0; i < this.contents.length; i++) {
            if (this.contents[i].name == name)
                return this.contents[i];
        }

        for (let i = 0; i < this.location.contents.length; i++) {
            if (this.location.contents[i].name == name)
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
        };
    }

}

class Being extends Thing {

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

class Player extends Being {
    constructor() {
        super();
        this.connections = [ ];
        this.saved_location = null;
        this.moveto(limbo);

        this.wizard = false;
        this.position = 'standing';
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
        this.connections.forEach((conn) => { conn.send_log(text); });
    }

    tell_msg(msg) {
        this.connections.forEach((conn) => { conn.send_json(msg); });
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

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this == player) {
            if (this.position != 'standing' || all)
                verbs.push('stand');
            if (this.position != 'sitting' || all)
                verbs.push('sit');
        }
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
}


class Room extends Thing {
    constructor() {
        super();
        this.exits = [ ];
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
        // TODO reasons for not letting the player in... locked? etc
        return true;
    }


    get_view(player) {
        let view = super.get_view(player);
        view.contents = this.contents.filter((obj) => { return obj != player }).map(function (item) {
            return item.get_view(player);
        });
        view.exits = this.exits.map(function (item) {
            return {
                name: item.name,
                title: item.title,
            };
        });
        return view;
    }

    update_all_players(section) {
        this.contents.map(function (item) {
            if (item.update_view)
                item.update_view(section);
        });
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        verbs.push('favorite');
        if (player.wizard)
            verbs.push('dig', 'add_exit');
        if (all)
            verbs.push('look', 'say', 'emote', 'shout', 'go');
        return verbs;
    }


    look(args) {
        
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

    dig(direction, room) {
        if (!room)
            return;
        let exit = new Exit();
        exit.name = direction;
        exit.title = room.title;
        exit.source = this;
        exit.dest = room;
        this.exits.push(exit);

        let rexit = new Exit();
        rexit.name = rexit.opposite_direction(direction);
        rexit.title = this.title;
        rexit.source = room;
        rexit.dest = this;
        room.exits.push(rexit);
    }

    go(args) {
        for (let i = 0; i < this.exits.length; i++) {
            if (this.exits[i].name == args.text) {
                this.exits[i].invoke(args.player);
                return;
            }
        }
        args.player.tell("You can't go that way.");
    }
}

class Exit extends Thing {
    constructor() {
        super();
        this.source = null;
        this.dest = null;
    }

    invoke(player) {
        if (!player.location == this.source)
            return;
        if (!this.dest.acceptable(player)) {
            player.tell("You cannot go that way.");
            return;
        }
        this.source.tell_all_but(player, player.title + " leaves " + this.name);
        player.moveto(this.dest);
        if (player.location != this.dest) {
            player.tell("Something went wrong and you're in the same location.");
            return;
        }
        player.tell("You go " + this.name + " to " + this.dest.title);
        this.dest.tell_all_but(player, player.title + " enters from " + this.opposite_direction(this.name));

        this.source.update_all_players('location');
        this.dest.update_all_players('location');
    }

    opposite_direction(direction) {
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
        if (this.location == args.player.location) {
            this.moveto(args.player);

            //args.player.tell("<action>You pick up " + this.name);
            //args.player.location.tell_all_but(args.player, "<action>" + args.player.name + " picks up " + this.name);
            args.player.tell(this.format(this.msg_take_success_you, args));
            args.player.location.tell_all_but(args.player, this.format(this.msg_take_success_others, args));

            args.player.update_view('player');
            args.player.location.update_all_players('location');
        }
        else {
            //args.player.tell("You can't pick that up");
            args.player.tell(this.format(this.msg_take_fail_you, args));
            args.player.location.tell_all_but(args.player, this.format(this.msg_take_fail_others, args));
        }
    }

    drop(args) {
        console.log(arguments);
        if (this.location == args.player) {
            this.moveto(args.player.location);

            //args.player.tell("<action>You drop " + this.name);
            //args.player.location.tell_all_but(args.player, "<action>" + args.player.name + " drops " + this.name);
            args.player.tell(this.format(this.msg_drop_success_you, args));
            args.player.location.tell_all_but(args.player, this.format(this.msg_drop_success_others, args));

            args.player.update_view('player');
            args.player.location.update_all_players('location');
        }
        else {
            args.player.tell(this.format(this.msg_drop_fail_you, args));
            args.player.location.tell_all_but(args.player, this.format(this.msg_drop_fail_others, args));
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

var Objects = [
    Root,
    Thing,
    Being,
    Player,
    Room,
    Exit,
    Item,
    UseableItem,
];



var limbo = new Room();
limbo.name = "limbo";
limbo.title = "Limbo";
limbo.description = "You are floating in a void of blackness.  You cannot make out anything.";


let wizard = new Player();
wizard.wizard = true;
wizard.name = "Wizard";
wizard.title = "Wizzy the Wizard";
wizard.description = "A short person with a long white beard and a pointy blue hat.";


let lowely = new Player();
lowely.name = "Lowely";
lowely.title = "Lowely Worm";
lowely.description = "An anthropormorphic worm with a green hat, and a single big brown boot.";

let lobby = new Room();
lobby.name = "lobby";
lobby.title = "The Lobby";
lobby.description = "You are in an empty hotel lobby.  There isn't anything here yet";

let coatcheck = new Room();
coatcheck.name = "coatcheck";
coatcheck.title = "The Coat Check";
coatcheck.description = "There is a counter here for checking your coats and belongings, but no one as behind the counter.";

lobby.dig('west', coatcheck);

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
ducky.annoy = function () {
    setTimeout(function () {
        ducky.location.say({ player: ducky, text: "Quack ".repeat(1 + Math.floor(Math.random() * 3)).trim() });
        ducky.annoy();
    }, 3000 + Math.random() * 20000);
};
ducky.annoy();



module.exports = {
    Objects,
    Root,
    Thing,
    Player,
    Room,
    Exit,
    wizard,
    lowely,
    limbo,
    lobby,
};

