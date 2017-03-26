
'use strict';

const DB = require('./db');
const Root = require('./root');
const Basic = require('./basic');

class GameUtils extends Root {

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        verbs.push('create');
        return verbs;
    }

    create(args) {
        if (args.player.body && !args.response) {
            args.player.prompt(this.id, 'create', { label: "You already have an adventuring body.  Would you like to exchange it for a new one?", submit: 'yes', cancel: 'no' });
        }
        else {
            if (args.player.body) {
                args.player.body = null;
                args.response = null;
            }

            if (!this.check_form(args, 'create'))
                return;

            args.player.body = new Character(args.player, args.response.class, args.response.kind);
            console.log("CHR", args.player.body);
            args.player.tell("You've created a new character!");
        }
    }

    get_form_for(player, name) {
        switch (name) {
            case 'create':
                return { label: "What kind of adventurer would you like to be?", fields: [
                    { name: 'class', type: 'select', required: true, options: Classes.map((kind) => { return { value: kind.name, info: kind.info }; }) },
                    { name: 'kind', type: 'select', required: true, options: Kinds.map((kind) => { return { value: kind.name, info: kind.info }; }) },
                ] };
            default:
                return null;
        }
    }
}


const Classes = [
    {
        name: "Warrior",
    },
    {
        name: "Mage",
    },
    {
        name: "Thief",
    },
    {
        name: "Bard",
    },
    {
        name: "Rogue",
    },
];

const Kinds = [
    {
        name: "Human",
        info: "Humans are stinky and evil",
        size: "125-240",
        armor: 10,
        damage: 1
    },
    {
        name: "Cat",
        info: "Cats are cuddly and fun",
        size: "30-50",
        ac: 10,
        damage: 2
    },
    {
        name: "Gnome",
        info:
        `The Gnome race has created some of the most remarkable
        clockwork inventions, rivalled only by the Hephestians in their expertise
        and craftsmanship.  However, their culture has suffered several setbacks,
        not the least of which was the fall of the Gnome capital, Gnomevale, when
        the Nameless One awoke on Crypt.  Nevertheless, the quick-thinking,
        fast-talking Gnomes continue to create mechanical contraptions with the
        hope that they will one day be able to reclaim their home.
        Geoph leads the Gnome race.`,
        size: "80-140",
        ac: 10,
        damage: 1
    },
];

class Character {
    constructor(owner, cls, kind) {
        if (!owner || !cls || !kind)
            return;
        this.owner = owner;
        this.class = cls;
        this.kind = kind;
        this.hp = 20;
        this.maxhp = 20;
        this.xp = 0;
        this.fighting = null;
        this.wielding = null;
        this.wearing = { };
    }


    timestep() {
        // TODO do... things...

        if (this.hp < this.maxhp) {
            this.hp += 1;
            this.owner.update_view('player');
        }
    }
}
DB.register(Character);


class WearableItem extends Basic.Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player && player.body)
            verbs.push(player.body.wielding != this ? 'wear|this' : 'unwear|this');
        return verbs;
    }

    wear(args) {

    }

    unwear(args) {

    }
}


class WieldableItem extends Basic.Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player && player.body)
            verbs.push(player.body.wielding != this ? 'wield|this' : 'unwield|this');
        return verbs;
    }

    wield(args) {
        if (!args.player.body)
            args.player.tell("You must have created a character in order to wield this.");
        else if (args.dobj.location != args.player)
            args.player.tell("You have to be carrying this to wield it");
        else {
            args.player.body.wielding = this;
            args.player.update_view('player');
        }
    }

    unwield(args) {
        args.player.body.wielding = null;
        args.player.update_view('player');
    }
}


class EdibleItem extends Basic.Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('eat|this');
        return verbs;
    }

    eat(args) {

    }
}


class DrinkableItem extends Basic.Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('drink|this');
        return verbs;
    }

    drink(args) {

    }
}


class MortalBeing extends Basic.Being {
    constructor(options) {
        super(options);
        MortalBeing.list.push(this);
        this.body = { };
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (player.body && this.location instanceof FightingRoom)
            verbs.push(player.body.fighting != this ? 'fight|this' : 'flee/stop/runaway');
        return verbs;
    }

    fight(args) {
        this.location.fight(args);
    }

    flee(args) {
        this.location.flee(args);
    }

    timestep() {
        // TODO move around, attack maybe
    }
}
MortalBeing.list = [ ];


class FightingRoom extends Basic.Room {
    ejectable(obj) {
        return !obj.body || !obj.body.fighting;
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (player.body)
            verbs.push(!player.body.fighting ? 'fight|object' : 'flee/stop/runaway');
        return verbs;
    }

    fight(args) {
        if (args.player.body.fighting)
            args.player.tell("You are already fighting something!");
        else if (args.dobj == args.player)
            args.player.tell("You can't fight yourself, silly.");
        else if (!(args.dobj instanceof MortalBeing) || !args.dobj.body)
            args.player.tell(this.format("You can't fight {dobj.title}.", args));
        else if (args.player.location != args.dobj.location)
            args.player.tell("You can't fight someone who isn't here.");
        else {
            // TODO restrictions?  initiative?
            args.player.body.fighting = args.dobj;
            // TODO after initial attack, assuming player gets initiative, do they run away?
            args.dobj.body.fighting = args.player;

            args.player.tell(this.format("<action>You start fighting {dobj.title}.", args));
            args.dobj.tell(this.format("<action>{player.title} start fighting you!", args));
            args.player.location.tell_all_but([ args.player, args.dobj ], this.format("<action>{player.title} start fighting {dobj.title}!", args));
            args.player.location.update_contents();
        }
    }

    flee(args) {
        if (!args.player.body.fighting)
            args.player.tell("You aren't fighting anything!?");
        else {
            // TODO all sorts of checks
            let opponent = args.player.body.fighting;
            args.player.body.fighting = null;
            // TODO check if opponent stops fighting
            opponent.body.fighting = null;

            args.player.tell(this.format("<action>You flee from the fight.", args));
            opponent.tell(this.format("<action>{player.title} runs away!", args));
            args.player.location.tell_all_but([ args.player, opponent ], args.player.format("<action>{this.title} runs away from {title}!", opponent));
            args.player.location.update_contents();
        }
    }
}


(function TimeCycle() {
    let start = Date.now();

    // TODO could you call a timestep function on the player character, as well as the room, and monsters, etc; so they can move

    let fightingPlayers = [ ];
    for (let i in Basic.Player.connectedPlayers) {
        let player = Basic.Player.connectedPlayers[i];
        if (!player.body)
            continue;

        player.body.timestep();

        if (player.body.fighting)
            fightingPlayers.push(player);
    }

    for (let i in MortalBeing.list) {
        let being = MortalBeing.list[i];

        being.timestep();

        if (being.body.fighting)
            fightingPlayers.push(being);
    }


    for (let i in fightingPlayers) {
        let player = fightingPlayers[i];
        let opponent = player.body.fighting;

        // TODO check for iniative?  maybe you can do that by reordering the list
        // TODO do actual fight thing

        player.tell(player.format("<attack>You hit {fighting.title} with your fist", player.body));
        opponent.tell(opponent.format("<defense>{title} hits you with their fist!", player));
    }

    setTimeout(TimeCycle, Math.max(8000 - (Date.now() - start), 3000));
})();


module.exports = {
    //GameUtils: new GameUtils({ id: -1 }),
    GameUtils,
    WearableItem,
    WieldableItem,
    EdibleItem,
    DrinkableItem,
    MortalBeing,
    FightingRoom,
};

