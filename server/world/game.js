
'use strict';

const { DB, Root } = require('./objects');
const Basic = require('./basic');

class GameUtils extends Root {

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        verbs.push('create');
        return verbs;
    }

    create(args) {
        if (args.player.stats && !args.response) {
            args.player.prompt(this.id, 'create', { label: "You already have an adventuring body.  Would you like to exchange it for a new one?", submit: 'yes', cancel: 'no' });
        }
        else {
            if (args.player.stats) {
                args.player.stats = null;
                args.response = null;
            }

            if (!this.check_form(args, 'create'))
                return;
/*
            args.player.stats = {
                class: args.response.class,
                hp: 20,
                maxhp: 20,
                xp: 0,
                fighting: null,
                wielding: null,
                wearing: { },
            };
*/
            args.player.stats = new Character(args.response.class, args.response.kind);
            console.log("CHR", args.player.stats);
            args.player.tell("You've created a new character!");
        }
    }

    get_form_for(player, name) {
        switch (name) {
            case 'create':
                return { label: "What kind of adventurer would you like to be?", fields: [
                    { name: 'class', type: 'select', required: true, options: [
                        "Warrior",
                        "Mage",
                        "Thief",
                        "Bard",
                        "Rogue",
                    ] },
                    { name: 'kind', type: 'select', required: true, options: Kinds.map((kind) => { return { value: kind.name, info: kind.info }; }) },
                ] };
            default:
                return null;
        }
    }
}


const Classes = [

];

const Kinds = [
    {
        name: "Human",
        info: "Humans are stinky and evil"
    },
    {
        name: "Cat",
        info: "Cats are cuddly and fun"
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
        Geoph leads the Gnome race.`
    },
];

class Character {
    constructor(cls, kind) {
        if (!cls || !kind)
            return;
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
    }
}
DB.register(Character);


class WearableItem extends Basic.Item {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player && player.stats)
            verbs.push(player.stats.wielding != this ? 'wear|this' : 'unwear|this');
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
        if (this.location == player && player.stats)
            verbs.push(player.stats.wielding != this ? 'wield|this' : 'unwield|this');
        return verbs;
    }

    wield(args) {
        if (!args.player.stats)
            args.player.tell("You must have created a character in order to wield this.");
        else if (args.dobj.location != args.player)
            args.player.tell("You have to be carrying this to wield it");
        else {
            args.player.stats.wielding = this;
            args.player.update_view('player');
        }
    }

    unwield(args) {
        args.player.stats.wielding = null;
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

    }


    timestep() {
        // TODO move around, attack maybe
    }
}

class FightingRoom extends Basic.Room {
    ejectable(obj) {
        return !obj.stats || !obj.stats.fighting;
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (player.stats)
            verbs.push(!player.stats.fighting ? 'fight|object' : 'flee/stop/runaway');
        return verbs;
    }

    fight(args) {
        if (args.player.stats.fighting)
            args.player.tell("You are already fighting something!");
        else if (args.dobj == args.player)
            args.player.tell("You can't fight yourself, silly.");
        else if (!(args.dobj instanceof MortalBeing))
            args.player.tell(this.format("You can't fight {dobj.title}.", args));
        else {
            // TODO restrictions?  initiative?
            args.player.stats.fighting = args.dobj;
            // TODO after initial attack, assuming player gets initiative, do they run away?
            args.dobj.stats.fighting = args.player;
        }
    }

    flee(args) {
        if (!args.player.stats.fighting)
            args.player.tell("You aren't fighting anything!?");
        else {
            // TODO all sorts of checks
            let opponent = args.player.stats.fighting;
            args.player.stats.fighting = null;
            // TODO check if opponent stops fighting
            opponent.stats.fighting = null;
        }
    }
}


(function TimeCycle() {
    let start = Date.now();

    // TODO could you call a timestep function on the player character, as well as the room, and monsters, etc; so they can move

    let fightingPlayers = [ ];
    for (let i in Basic.Player.connectedPlayers) {
        let player = Basic.Player.connectedPlayers[i];
        if (!player.stats)
            continue;

        if (player.stats.hp < player.stats.maxhp) {
            player.stats.hp += 1;
            player.update_view();
        }

        if (player.stats.fighting)
            fightingPlayers.push(player);
    }

    for (let i in fightingPlayers) {
        // TODO check for iniative?  maybe you can do that by reordering the list
        // TODO do actual fight thing
    }

    setTimeout(TimeCycle, Math.max(15000 - (Date.now() - start), 5000));
})();


module.exports = {
    GameUtils: new GameUtils({ id: -1 }),
    //GameUtils,
    WearableItem,
    WieldableItem,
    EdibleItem,
    DrinkableItem,
    MortalBeing,
    FightingRoom,
};

