
'use strict';


class Root {
    constructor() {
        this.name = "unnamed object";
        this.location = null;
        this.contents = [];
    }

    tell(text) {
        // do nothing
    }

    moveto(location) {
        if (!location)
            return;
        // TODO check if can leave current location
        // TODO check if can enter new location
        if (this.location) {
            this.location.contents = this.location.contents.filter((item) => { return item != this });
            console.log("CONT", this.location.contents);
        }
        location.contents.push(this);
        this.location = location;
    }

    acceptable(obj) {
        return false;
    }
}

class Thing extends Root {
    constructor() {
        super();
        this.title = "A nondiscript object";
        this.description = "You aren't sure what it is.";
    }

}

class Player extends Thing {
    constructor() {
        super();
        this.connection = null;
    }

    connect(conn) {
        this.connection = conn;
    }

    tell(text) {
        if (this.connection) {
            this.connection.send_log(text);
        }
    }

    get_view(player) {
        return {
            name: this.name,
            title: this.title,
            description: this.description,
            contents: this.contents.map((item) => { return item.title }),
        };
    }

    update_view(section) {
        if (this.connection) {
            let msg = { type: 'update' };
            if (!section || section == 'player')
                msg.player = this.get_view(this);
            if (!section || section == 'location')
                msg.location = this.location.get_view(this);
            this.connection.send_json(msg);
        }
    }
}

class Room extends Thing {
    constructor() {
        super();
        this.exits = [ ];
    }

    acceptable(obj) {
        // TODO reasons for not letting the player in... locked? etc
        return true;
    }

    look() {
        
    }

    say(args) {
        args.player.tell("You say, \"" + args.text + "\"");
        this.tell_all_but(args.player, args.player.name + " says, \"" + args.text + "\"");
    }

    tell_all_but(player, text) {
        this.contents.map(function (obj) {
            if (obj != player)
                obj.tell(text);
        });
    }

    get_view(player) {
        return {
            name: this.name,
            title: this.title,
            description: this.description,
            contents: this.contents.map((item) => { if (item != player) return item.title + " is waiting here." }),
            exits: this.exits.map((item) => { return [ item.name, item.title ]; }),
        };
    }

    update_all_players(section) {
        this.contents.map(function (item) {
            if (item.update_view)
                item.update_view(section);
        });
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
        player.tell("You go " + this.name);
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


let wizard = new Player();
wizard.name = "Wizard";
wizard.title = "Wizzy the Wizard";
wizard.description = "A short person with a long white beard and a pointy blue hat.";

let lowely = new Player();
lowely.name = "Lowely";
lowely.title = "Lowely The Worm";
lowely.description = "An anthropormorphic worm with a green hat, and a single big brown boot.";

let limbo = new Room();
limbo.name = "limbo";
limbo.title = "Limbo";
limbo.description = "You are floating in a void of blackness.  You cannot make out anything.";

wizard.moveto(limbo);
lowely.moveto(limbo);

let lobby = new Room();
lobby.name = "lobby";
lobby.title = "The Lobby";
lobby.description = "You are in an empty hotel lobby.  There isn't anything here yet";

limbo.dig('north', lobby);

let doohickey = new Thing();
doohickey.name = "Doohickey";
doohickey.title = "A Doohickey";
doohickey.description = "It's a general purpose tool for anything you want.";
doohickey.moveto(wizard);



let World = [
    Root,
    Thing,
    Player,
    Room,
    Exit,
    wizard,
    lowely,
    limbo,
    lobby,
];

module.exports = {
    Objects: World,
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

