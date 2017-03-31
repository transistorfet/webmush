
'use strict';

const DB = require('./db');
const Root = require('./root');
const Basic = require('./basic');

class GameUtils extends Root {

    onLoad() {
        DB.define(this.name, this);
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        verbs.push('create');
        if (player.body)
            verbs.push(!player.body.fighting ? 'fight|object' : 'flee/stop/runaway');
        return verbs;
    }

    create(args) {
        if (args.player.body && !args.response) {
            args.player.prompt(this.id, 'create', { label: "You already have an adventuring body.  Would you like to exchange it for a new one?", submit: 'yes', cancel: 'no' });
        }
        else {
            if (args.player.body) {
                args.player.body.recycle();
                args.player.body = null;
                args.response = null;
            }

            if (!this.check_form(args, 'create'))
                return;

            args.player.body = new PlayerCharacter({}, this, args.player);
            // TODO move the actual character creation to the initialize step instead of the constructor, so loading doesn't recreated a character only to be overwritten
            args.player.body.initialize({ kind: args.response.kind, class: args.response.class });
            args.player.body.name = args.player.name + "'s Body";
            args.player.tell("You've created a new character!");
            args.player.location.update_contents();
        }
    }

    get_form_for(player, name) {
        switch (name) {
            case 'create':
                return { label: "What kind of adventurer would you like to be?", fields: [
                    { name: 'kind', type: 'select', required: true, options: this.kinds.reduce((l, v) => { if (v.playable) l.push({ value: v.name, info: v.info }); return l; }, []) },
                    { name: 'class', type: 'select', required: true, options: this.classes.reduce((l, v) => { if (v.playable) l.push({ value: v.name, info: v.info }); return l; }, []) },
                    // TODO background/education level and type/family wealth/etc...
                ] };
            default:
                return null;
        }
    }

    create_npc(options) {
        let npc = new PlayerCharacter({}, this);
        npc.initialize({ kind: options.kind ? options.kind : 'Goat', class: options.class ? options.class : 'Fighter' });
        return npc;
    }

    /*
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (player.body)
            verbs.push(!player.body.fighting ? 'fight|object' : 'flee/stop/runaway');
        return verbs;
    }
    */

    fight(args) {
        let character = args.player.body;

        if (character.fighting)
            args.player.tell("You are already fighting something!");
        else if (args.dobj == args.player)
            args.player.tell("You can't fight yourself, silly.");
        else if (!(args.dobj instanceof MortalBeing))
            args.player.tell(this.format("You can't fight {dobj.title}.", args));
        else if (args.player.location != args.dobj.location)
            args.player.tell("You can't fight someone who isn't here.");
        else if (!args.player.location.allowfighting)
            args.player.tell("You aren't allowed to fight here.  Take it outside.");
        else {
            // TODO restrictions?  initiative?
            character.fighting = args.dobj;
            // TODO after initial attack, assuming player gets initiative, do they run away?
            args.dobj.fighting = character;

            args.player.tell(this.format("<action>You start fighting {dobj.title}.", args));
            args.dobj.tell(this.format("<action>{player.title} start fighting you!", args));
            args.player.location.tell_all_but([ args.player, args.dobj ], this.format("<action>{player.title} start fighting {dobj.title}!", args));
            args.player.location.update_contents();
        }
    }

    flee(args) {
        let character = args.player.body;

        if (!character.fighting)
            args.player.tell("You aren't fighting anything!?");
        else {
            // TODO all sorts of checks
            let opponent = character.fighting;
            character.fighting = null;
            // TODO check if opponent stops fighting
            opponent.fighting = null;

            args.player.tell(this.format("<action>You flee from the fight.", args));
            opponent.tell(this.format("<action>{player.title} runs away!", args));
            args.player.location.tell_all_but([ args.player, opponent ], args.player.format("<action>{this.title} runs away from {title}!", opponent));
            args.player.location.update_contents();
        }
    }


    static roll(dice, sides) {
        let roll = 0;
        for (let i = 0; i < dice; i++)
            roll += Math.floor(Math.random() * sides + 1);
        return roll;
    }


}



/*
attack
defense
damage
str
dex
int
wis
con
cha
luck


Effect:
 attack: +1, str: +1

add all effects to base stats to get current stats


*/




class MortalBeing extends Basic.Being {
    constructor(options, gameutils) {
        super(options);
        MortalBeing.list.push(this);
        this.gameutils = gameutils;
    }

    initialize(options) {
        // TODO this is for when you create a new object and want to specify how to initialize it;
        this.kind = options.kind;
        this.class = options.class;

        this.level = 1;
        this.xp = 0;
        this.hp = 20;
        this.maxhp = 20;
        this.base_stats = this.make_stats(this.kind, this.class);

        this.fighting = null;
        this.wimpy = 0.2;
        this.wielding = null;
        this.wearing = { };
        this.coins = 0;
    }

    moveable(to, by) {
        // TODO can't leave room when fighting
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (player.body && player.location.allowfighting)
            verbs.push(player.body.fighting != this ? 'fight|this' : 'flee/stop/runaway');
        return verbs;
    }

    fight(args) {
        //this.location.fight(args);
        this.gameutils.fight(args);
    }

    flee(args) {
        //this.location.flee(args);
        this.gameutils.flee(args);
    }


    timestep() {
        // TODO do... things...

        if (this.hp < this.maxhp) {
            this.hp += 0.5;
            return true;
        }
    }

    make_stats(kindname, classname) {
        let kind = DB.Named.RealmUtils.kinds.find((kind) => { return kind.name == kindname });
        return {
            str: GameUtils.roll(3, 6),
            dex: GameUtils.roll(3, 6),
            int: GameUtils.roll(3, 6),
            wis: GameUtils.roll(3, 6),
            con: GameUtils.roll(3, 6),
            cha: GameUtils.roll(3, 6),
            luck: GameUtils.roll(3, 6),

            attack: kind.attack,
            defense: kind.defense,
            damage: kind.damage,
        };
    }

    update_stats() {
        this.stats = Object.assign({}, this.base_stats, { $nosave: true });
    }

    roll_initiative() {
        let initRoll = GameUtils.roll(1, 20);
        return initRoll + (this.stats.dex - 10) * 0.1;
    }

    /*
    attack() {
        return this.stats.attack + this.stats.str * 0.2;
    }

    defense() {
        return this.stats.defense + this.stats.dex * 0.2;
    }

    damage() {
        return this.stats.damage;
    }
    */

    calc_damage(opponent) {
        let attackRoll = GameUtils.roll(1, 20);
        let attackMod = /*this.stats.attack + */ (this.stats.str - 10) * 0.2;
        let defenseMod = opponent.stats.defense;
        console.log("To Hit", attackRoll, attackMod, defenseMod);
        if (attackRoll + attackMod > defenseMod) {
            let damageRoll = Math.random();
            return Math.floor(damageRoll + this.stats.damage);
        }
        return 0;
    }

    attack_opponent(opponent) {
        let damage = this.calc_damage(opponent);
        console.log("Damage", damage);
        if (damage <= 0) {
            this.tell(this.format("<attack>You MISSED {title}!?", opponent));
            opponent.tell(opponent.format("<defense>{title} MISSED you!", this));
        }
        else {
            opponent.hp -= damage;
            if (opponent.hp > 0) {
                this.tell(this.format("<attack>You hit {title} with your fist", opponent));
                opponent.tell(opponent.format("<defense>{title} hits you with their fist!", this));
            }
            else {
                this.tell(this.format("<attack>You KILLED {title}!!! How could you!?", opponent));
                opponent.tell(opponent.format("<defense>{title} has killed you... you are now dead", this));
            }
        }
    }
}
MortalBeing.list = [ ];


(function TimeCycle() {
    let start = Date.now();

    // TODO could you call a timestep function on the player character, as well as the room, and monsters, etc; so they can move

    let fightingPlayers = [ ];
    for (let i in MortalBeing.list) {
        let being = MortalBeing.list[i];
        if (!being)
            continue;

        being.timestep();

        if (being.fighting) {
            being.update_stats();
            fightingPlayers.push([ being, being.roll_initiative() ]);
        }
    }

    // Determine initiative order
    fightingPlayers.sort((a, b) => { return a[1] - b[1] });

    for (let i in fightingPlayers) {
        let character = fightingPlayers[i][0];
        let opponent = character.fighting;

        // TODO do actual fight thing
        character.attack_opponent(opponent);

        //player.tell(player.format("<attack>You hit {fighting.title} with your fist", player.body));
        //opponent.tell(opponent.format("<defense>{title} hits you with their fist!", player));
    }

    setTimeout(TimeCycle, Math.max(8000 - (Date.now() - start), 3000));
})();



class NonPlayerCharacter extends MortalBeing {
    constructor(options, gameutils) {
        super(options, gameutils);
    }

    timestep() {
        return super.timestep();
        // TODO move around, attack maybe
    }
}


class PlayerCharacter extends MortalBeing {
    constructor(options, gameutils, owner) {
        super(options, gameutils);
        this.owner = owner;
    }

    tell(text) {
        if (this.owner)
            this.owner.tell(text);
    }

    tell_msg(msg) {
        if (this.owner)
            this.owner.tell_msg(msg);
    }

    // TODO move to MortalBeing
    get_view(player) {
        let view = super.get_view(player);
        view.kind = this.kind;
        view.class = this.class;
        view.hp = this.hp;
        view.maxhp = this.maxhp;
        view.xp = this.xp;
        view.fighting = this.fighting ? this.fighting.name : 'nobody';
        return view;
    }

    get_template(player) {
        // TODO are there dangers of this?  maybe move it to MortalBeing?
        if (player != this && player != this.owner) {
            return function (context) {
                return m('table', { class: 'body' }, 'hey');
            };
        }
        else {
            return function (context) {
                // TODO full info
                return m('table', { class: 'body' }, 'hey');
            };
        }
        return [
            { type: 'table', children: [
                'kind',
                'class',
                [ "HP", 'hp' ],
            ] },
            //T('table', [ T('data', 'kind'), T('data', 'hp', 'HP') ])
        ];
    }


    update_contents() {
        this.owner.update_view('body');
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (all)
            verbs.push('help/info');
        return verbs;
    }

    help(args) {
        let text = args.text.trim().toLowerCase();

        let kind = this.gameutils.kinds.find((kind) => { return kind.name.toLowerCase() == text; });
        if (kind)
            args.player.tell_msg({ type: 'update', details: { title: "Kind: " + kind.name, description: kind.info } });

        let cls = this.gameutils.kinds.find((cls) => { return cls.name.toLowerCase() == text; });
        if (cls)
            args.player.tell_msg({ type: 'update', details: { title: "Class: " + cls.name, description: cls.info } });
    }

    timestep() {
        if (super.timestep() && this.owner) {
            this.owner.update_view('body');
            return true;
        }
        return false;
    }
}


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
            args.player.update_view('player,body');
        }
    }

    unwield(args) {
        args.player.body.wielding = null;
        args.player.update_view('player,body');
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


class VendingMachine extends Basic.Thing {
    
}


module.exports = {
    GameUtils,
    MortalBeing,
    NonPlayerCharacter,
    PlayerCharacter,
    WearableItem,
    WieldableItem,
    EdibleItem,
    DrinkableItem,
    VendingMachine,
};

