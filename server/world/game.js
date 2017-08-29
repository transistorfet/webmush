
'use strict';

const DB = require('./db');
const Root = require('./root');
const Basic = require('./basic');
const Response = require('./response');

const Strings = require('../../lib/strings');
const Templates = require('../../lib/templates');


const GenericKind = {
    name: "Generic Kind",
    info: "Not much is known about these creatures",
    playable: false,
    size: "80-140",
    attack: 0,
    defense: 10,
    damage: [1, 4, 0],
    attackmsgs: [
        new Response(
            "<attack>You hit {dobj.title}",
            "<defense>{player.title} hits",
            "<action>{player.title} hits {dobj.title}"
        ),
    ],
};

const GenericClass = {
    name: "Generic Class",
    playable: false,
};


class GameUtils extends Root {
    constructor(options) {
        super(options);
        this.kinds = [ ];
        this.classes = [ ];
    }

    onLoad() {
        DB.define(this.name, this);
    }

    add_kind(kind) {
        Object.setPrototypeOf(kind, kind.prototype || GenericKind);
        let i = this.kinds.findIndex((k) => { return k.name == kind.name });
        if (i >= 0)
            this.kinds[i] = kind;
        else
            this.kinds.push(kind);
    }

    add_class(cls) {
        Object.setPrototypeOf(cls, cls.prototype || GenericClass);
        let i = this.classes.findIndex((c) => { return c.name == cls.name });
        if (i >= 0)
            this.classes[i] = cls;
        else
            this.classes.push(cls);
    }


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
                //args.player.body.recycle();
                args.player.body.owner = null;
                args.player.body = null;
                args.response = null;
            }

            if (!this.check_form(args, 'create'))
                return;

            args.player.body = new Body({ kind: args.response.kind, class: args.response.class, gameutils: this, owner: args.player });
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
        // TODO this is now wrong
        let npc = new Basic.CorporealBeing({}, this);
        npc.body = new Body({ kind: options.kind || 'Goat', class: options.class || 'Fighter', gameutils: this, owner: npc });
        return npc;
    }

    help(args) {
        let text = args.text.trim().toLowerCase();

        let kind = this.kinds.find((kind) => { return kind.name.toLowerCase() == text; });
        if (kind)
            args.player.tell_msg({ type: 'update', details: { title: "Kind: " + kind.name, description: kind.info } });

        let cls = this.kinds.find((cls) => { return cls.name.toLowerCase() == text; });
        if (cls)
            args.player.tell_msg({ type: 'update', details: { title: "Class: " + cls.name, description: cls.info } });
    }

    static roll(dice, sides, mod) {
        let roll = 0;
        for (let i = 0; i < dice; i++)
            roll += Math.floor(Math.random() * sides + 1);
        return roll + (mod || 0);
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


Templates.set('GameBodyDetails', function (body)
{
    return [
        m('div', { }, body.state + ' and ' + body.stance),
        m('div', { class: 'column-display' }, [
            m('table', [
                m('tr', [
                    m('td', { class: 'tinylabel' }, "Kind:"),
                    // TODO fix this link to get info on your kind, displayed in the details window maybe?  the details window might have to become more generic
                    m('td', m('a', { onclick: World.info.bind(World, body.kind) }, body.kind)),
                    m('td', { class: 'tinylabel' }, "Class:"),
                    m('td', m('a', { onclick: World.info.bind(World, body.class) }, body.class)),
                ]),
                m('tr', [
                    m('td', { class: 'tinylabel' }, "HP:"),
                    m('td', body.hp + " / " + body.maxhp),
                ]),
                m('tr', [
                    m('td', { class: 'tinylabel' }, "Level:"),
                    m('td', body.level),
                    m('td', { class: 'tinylabel' }, "XP:"),
                    m('td', body.xp),
                ]),
                m('tr', [
                    m('td', { class: 'tinylabel' }, "You're fighting:"),
                    m('td', body.fighting),
                ]),
            ]),
            m('table', [
                m('tr', [
                    m('td', { class: 'tinylabel' }, "STR:"),
                    m('td', body.str),
                ]),
                m('tr', [
                    m('td', { class: 'tinylabel' }, "DEX:"),
                    m('td', body.dex),
                ]),
                m('tr', [
                    m('td', { class: 'tinylabel' }, "INT:"),
                    m('td', body.int),
                ]),
                m('tr', [
                    m('td', { class: 'tinylabel' }, "WIS:"),
                    m('td', body.wis),
                ]),
                m('tr', [
                    m('td', { class: 'tinylabel' }, "CON:"),
                    m('td', body.con),
                ]),
                m('tr', [
                    m('td', { class: 'tinylabel' }, "CHA:"),
                    m('td', body.cha),
                ]),
                m('tr', [
                    m('td', { class: 'tinylabel' }, "Luck:"),
                    m('td', body.luck),
                ]),
            ]),
        ]),
    ];
});



class Body {
    constructor(options) {
        if (!options) {
            console.log("Attempted to create body without data");
            return;
        }

        Body.list.push(this);
        this.gameutils = options.gameutils;
        this.owner = options.owner;
        // TODO do you need to set mode here?
        this.initialize(options);
    }

    initialize(options) {
        if (options.$mode == 'load')
            return;
        this.kind = options.kind;
        this.class = options.class;

        this.state = 'alive';
        this.stance = 'standing';
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

    onLoad() {
        this.fighting = null;
    }

    duplicate(options, owner) {
        let body = new Body(options, this.gameutils, owner);
        // TODO can't assign because these will be overwritten
    }

    get_view(player) {
        //let view = super.get_view(player);
        let view = { };
        view.template = "GameBodyDetails";
        view.kind = this.kind;
        view.class = this.class;
        view.state = this.state;
        view.stance = this.stance;
        view.level = this.level;
        view.xp = this.xp;
        view.hp = this.hp;
        view.maxhp = this.maxhp;
        view.str = this.base_stats.str;
        view.dex = this.base_stats.dex;
        view.int = this.base_stats.int;
        view.wis = this.base_stats.wis;
        view.con = this.base_stats.con;
        view.cha = this.base_stats.cha;
        view.luck = this.base_stats.luck;
        view.fighting = this.fighting ? this.fighting.name : 'nobody';
        return view;
    }

    kindinfo() {
        return this.gameutils.kinds.find((kind) => { return kind.name == this.kind });
    }

    classinfo() {
        return this.gameutils.classes.find((cls) => { return cls.name == this.class });
    }

    timestep() {
        // TODO do... things...

        if (this.hp < this.maxhp) {
            this.hp += 0.5;
            return true;
        }
    }

    make_stats(kindname, classname) {
        let kind = this.kindinfo();
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

    calc_damage(opponentbody) {
        let attackRoll = GameUtils.roll(1, 20);
        let attackMod = (this.stats.str - 10) * 0.2;
        let defenseMod = opponentbody.stats.defense;
        console.log("To Hit", attackRoll, attackMod, defenseMod);
        if (attackRoll + attackMod > defenseMod) {
            let damageRoll = GameUtils.roll.apply(null, this.wielding ? this.wielding.damage : this.stats.damage);
            return damageRoll;
        }
        return 0;
    }

    attack_opponent(opponentbody) {
        let damage = this.calc_damage(opponentbody);
        console.log("Damage", damage, this.wielding ? this.wielding.damage : this.stats.damage);
        opponentbody.hp -= damage;

        if (opponentbody.hp <= 0) {
            this.fighting = null;
            opponentbody.fighting = null;

            this.win(opponentbody);
            opponentbody.die();
        }
        return damage;
    }

    win(opponentbody) {
        this.xp += Math.floor(Math.pow(100, Math.log10(opponentbody.maxhp) / 1.15));
        // TODO check if you level up
    }

    die() {
        this.state = 'dead';
        this.lastdeath = Date.now();
        Corpse.make_for(this);
    }



    //// Owner-Hooked Methods ////
    get title() {
        if (this.state == 'dead')
            return "The Ghost Of " + (this.owner.fullname || this.owner.name);
        return this.owner.fullname || this.owner.name;
    }

    get brief() {
        if (this.owner)
            return this.owner.format("{title} is {body.stance} here.", this.owner);
        else
            return "A souless body is somehow here... this isn't supposed to happen";
    }

    acceptable(obj, by) {
        return true;
    }

    ejectable(obj, by) {
        // TODO this doesn't entirely work because the object move might still fail; this is only testing if it might fail...
        //      you could instead prevent objects being dropped if they're worn or wielded
        if (this.wielding == obj) {
            if (by)
                throw "You're still wielding that";
            else
                this.wielding = null;
        }
        // TODO check for dropping what's being worn
        return true;
    }

    moveable(to, by) {
        // TODO should you check if fighting, and stop the fighting if not by (if connecting/disconnecting/initializing)
        if (!by)
            return true;

        if (this.fighting)
            throw "You're in the middle of a fight!  You must flee to escape.";
        if (this.stance == 'sitting')
            throw "You're too relaxed to move.";
        return true;
    }

    visible(to) {
        if (this.state != 'alive')
            return false;
        return true;
    }


    verbs_for(player, all) {
        //let verbs = super.verbs_for(player, all);
        let verbs = [ ];
        if (all)
            verbs.push('help/info');
        if (this.owner == player) {
            if (this.stance != 'standing' || all)
                verbs.push('stand');
            if (this.stance != 'sitting' || all)
                verbs.push('sit');
            if (this.state == 'dead' || all)
                verbs.push('respawn');
        }
        else {
            if (player.body && player.location.allowfighting && (this.state == 'alive' || all)) {
                if (player.body.fighting != this.owner || all)
                    verbs.push('fight/kill|this');
                if (player.body.fighting == this.owner || all)
                    verbs.push('flee/stop/runaway');
            }
        }
        return verbs;
    }

    fight(args) {
        if (!args.player.body)
            args.player.tell("You have to have a body before you can fight");
        else if (args.player.body.fighting)
            args.player.tell("You are already fighting something!");
        else if (args.dobj == args.player)
            args.player.tell("You can't fight yourself, silly.");
        else if (!(args.dobj instanceof Basic.CorporealBeing) || !args.dobj.body)
            args.player.tell(args.player.format("You can't fight {dobj.title}.", args));
        else if (args.player.body.state != 'alive')
            args.player.tell(args.player.format("You can't fight if you're not alive.", args));
        else if (args.dobj.body.state != 'alive')
            args.player.tell(args.player.format("You can't fight someone who's not alive.", args));
        else if (args.player.location != args.dobj.location)
            args.player.tell("You can't fight someone who isn't here.");
        else if (!args.player.location.allowfighting)
            args.player.tell("You aren't allowed to fight here.  Take it outside.");
        else {
            // TODO restrictions?  initiative?
            args.player.body.fighting = args.dobj;
            // TODO after initial attack, assuming player gets initiative, do they run away?
            args.dobj.body.fighting = args.player;

            args.player.tell(args.player.location.format("<action>You start fighting {dobj.title}.", args));
            args.dobj.tell(args.player.location.format("<action>{player.title} start fighting you!", args));
            args.player.location.tell_all_but([ args.player, args.dobj ], args.player.location.format("<action>{player.title} start fighting {dobj.title}!", args));

            args.player.update_view('location');
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

            args.player.tell(args.player.location.format("<action>You flee from the fight.", args));
            opponent.tell(args.player.location.format("<action>{player.title} runs away!", args));
            args.player.location.tell_all_but([ args.player, opponent ], args.player.location.format("<action>{player.title} runs away from {opponent.title}!", { player: args.player, opponent: opponent }));

            args.player.update_view('location');
        }
    }

    respawn(args) {
        if (this.state == 'alive')
            args.player.tell("You are already alive");
        else {
            // TODO this is temporary; it should transfer you to heaven or something, or punish you somehow for dying
            this.state = 'alive';

            args.player.tell(args.player.location.format("<action>You spring back to life.", args));
            args.player.location.tell_all_but(args.player, args.player.location.format("<action>{player.title} springs back to life.", args).capitalize());
        new Response(
        ).tell_all(args);

            args.player.update_view('player,body');
            args.player.location.update_contents();
        }
    }


    sit(args) {
        this.stance = 'sitting';

        //args.player.tell("<action>You sit down on the ground.");
        //args.player.location.tell_all_but(args.player, Strings.format("<action>{player.name} sits down on the ground.", args));
        new Response(
            "<action>You sit down on the ground.",
            "<action>{player.name} sits down on the ground."
        ).tell_all(args);

        if (this.owner) {
            this.owner.update_view('player,body');
            if (this.owner.location);
                this.owner.location.update_contents();
        }
    }

    stand(args) {
        this.stance = 'standing';

        //args.player.tell("<action>You stand up.");
        //args.player.location.tell_all_but(args.player, Strings.format("<action>{player.name} stands up.", args));
        new Response(
            "<action>You stand up.",
            "<action>{player.name} stands up."
        ).tell_all(args);

        if (this.owner) {
            this.owner.update_view('player,body');
            if (this.owner.location);
                this.owner.location.update_contents();
        };
    }

    help(args) {
        this.gameutils.help(args);
    }


}
DB.register(Body);
Body.list = [ ];


(function TimeCycle() {
    let start = Date.now();

    // TODO could you call a timestep function on the player character, as well as the room, and monsters, etc; so they can move

    Body.list = Body.list.filter((body) => { return body.owner && body.owner.body == body });

    let fightingBodies = [ ];
    for (let i = 0; i < Body.list.length; i++) {
        let body = Body.list[i];

        let changed = body.timestep();
        if (changed && !body.fighting && body.owner)
            body.owner.update_view('body');

        if (body.fighting) {
            body.update_stats();
            fightingBodies.push([ body, body.roll_initiative() ]);
        }

        if (!(body.owner instanceof Basic.Player) && body.state == 'dead' && body.respawntime && (body.lastdeath + body.respawntime < start)) {
            body.state = 'alive';
            body.owner.location.tell_all_but(null, body.owner.format("<action>{this.title} springs back to life.").capitalize());
            body.owner.location.update_contents();
        }
    }

    // Determine initiative order
    fightingBodies.sort((a, b) => { return a[1] - b[1] });

    for (let i in fightingBodies) {
        let body = fightingBodies[i][0];
        let opponentbody = body.fighting ? body.fighting.body : null;

        // the fight might end before this character got a turn to hit
        if (!body || !opponentbody)
            continue;

        if (body.wielding && body.wielding.location != body.owner)
            body.wielding = null;

        let damage = body.attack_opponent(opponentbody);

        // TODO move this to gameutils?
        if (damage <= 0) {
            body.gameutils.respond_missed.tell_all({ player: body.owner, dobj: opponentbody.owner });
        }
        else if (opponentbody.hp > 0) {
            let weapon = body.wielding ? body.wielding : body.kindinfo();
            let response = weapon.attackmsgs[Math.floor(Math.random() * weapon.attackmsgs.length)];
            response.tell_all({ player: body.owner, dobj: opponentbody.owner });
        }
        else {
            body.gameutils.respond_killed.tell_all({ player: body.owner, dobj: opponentbody.owner });
        }

        opponentbody.owner.update_view('body');
        if (!body.fighting && body.owner.location)
            body.owner.location.update_contents();
    }

    setTimeout(TimeCycle, Math.max(8000 - (Date.now() - start), 3000));
})();

GameUtils.prototype.respond_missed = new Response(
    "<attack>You MISSED {dobj.name}!?",
    "<defense>{player.name} MISSES you!",
    "<action>{player.name} MISSES {dobj.name}!"
);

GameUtils.prototype.respond_killed = new Response(
    "<attack>You KILLED {dobj.name}!!! How could you!?",
    "<defense>{dobj.name} has killed you... you are now dead",
    "<action>{player.name} KILLS {dobj.name}!"
)



// TODO or should this instead inherit from item, and have a reference to another player object?
class BodyItem extends Basic.Item {
    initialize(options) {
        super.initialize(options);

        if (options.$mode == 'new') {
            this.owner = options.owner;
        }
    }

    //do_verb_for() {
        // TODO call the local ones or else call the Item ones, so you have pickup/drop etc
    //}

    swap(args) {
        // TODO set the ws.player value of all the connections to this object; it's like su
        // could even just disconnect() from the old player and connect() to this one, for each connection
        // but do you delete all the players connections and attach them this object?
    }
}







class WeightedItem extends Basic.Item {
    initialize(options) {
        super.initialize(options);

        if (options.$mode == 'new') {
            this.weight = 0;
        }
    }

    moveable(to, by) {
        if (to.isWizard)
            return true;
        if (!to.body)
            throw "You must have a physical body in order to interact with physical objects";
        if (to.body.state != 'alive')
            throw "You must be alive in order to pick that up.";

        let carrying = to.contents.reduce(function (acc, obj) {
            if (obj instanceof WeightedItem)
                acc += obj.weight;
            return acc;
        }, 0);

        if (100 - carrying < this.weight)
            throw this.format("You attempt to lift {name} but it wont budge.", obj);
    }

    editable_by(player) {
        let props = super.editable_by(player);
        if (player.isWizard)
            props.push('weight|number');
        return props;
    }
}


class WearableItem extends WeightedItem {
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


class WieldableItem extends WeightedItem {
    initialize(options) {
        super.initialize(options);

        if (options.$mode == 'new') {
            this.damage = [ 1, 4, 0 ];
        }
    }

    editable_by(player) {
        let props = super.editable_by(player);
        if (player.isWizard)
            props.push('damage|array');
        return props;
    }

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


class EdibleItem extends WeightedItem {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('eat|this');
        return verbs;
    }

    eat(args) {

    }
}


class DrinkableItem extends WeightedItem {
    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player)
            verbs.push('drink|this');
        return verbs;
    }

    drink(args) {

    }
}


class Corpse extends WeightedItem {
    initialize(options) {
        super.initialize(options);

        this.weight = 100;      // TODO calculate from kind info?
        Corpse.list.push(this);
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (player.body && player.body.state == 'alive')
            verbs.push('sacrifice');
        return verbs;
    }

    sacrifice(args) {
        this.location.tell_all_but(args.player, this.format("<action>{player.title} sacrifices {this.title} to the gods", args));
        args.player.tell(this.format("<action>You sacrifice {this.title} to the gods", args));
        Corpse.list = Corpse.list.filter((corpse) => { return corpse != this; });
        this.recycle();
    }

    static make_for(body) {
        let corpse = new Corpse();
        corpse.owner = body.owner;
        corpse.name = 'the corpse of ' + body.owner.name;
        corpse.timeofdeath = Date.now();
        let items = body.owner.contents.filter((obj) => { return obj instanceof WeightedItem; });
        items.map(function (obj) {
            obj.moveto(corpse, 'force');
        });
        corpse.moveto(body.owner.location, 'force');
        return corpse;
    }
}
Corpse.list = [ ];

(function CorpseRecycler() {
    let start = Date.now();
    Corpse.list = Corpse.list.filter(function (corpse) {
        if (start - corpse.timeofdeath > 3600000) {
            // TODO move items to the lost and found??
            corpse.location.tell_all_but(null, corpse.format("{this.name} decays into dust.").capitalize());
            corpse.recycle();
            return false;
        }
        else
            return true;
    });

    setTimeout(CorpseRecycler, 60000);
})();



class VendingMachine extends Basic.Thing {
    initialize(options) {
        super.initialize(options);

        if (options.$mode == 'new') {
            this.items = [ ];
        }
    }

    moveable(to, by) {
        if (by.isWizard)
            return true;
        throw "It's bolted to the ground and wont budge";
    }

    editable_by(player) {
        let props = super.editable_by(player);
        if (player.isWizard)
            props.push('items|array');
        return props;
    }

    verbs_for(player, all) {
        let verbs = super.verbs_for(player, all);
        if (this.location == player.location)
            verbs.push('purchase/buy|prompt');
        return verbs;
    }

    purchase(args) {
        console.log(args.response);
    }

    get_form_for(player, name) {
        switch (name) {
            case 'purchase':
                return { label: "What would you like to buy?", fields: this.items.map(function (item) {
                    return { type: 'radio', label: item.name, name: item.id };
                }), submit: 'Purchase' };
            default:
                return super.get_form_for(player, name);
        }
    }
}


module.exports = {
    GameUtils,
    Body,
    WeightedItem,
    WearableItem,
    WieldableItem,
    EdibleItem,
    DrinkableItem,
    VendingMachine,
    Corpse,
};

