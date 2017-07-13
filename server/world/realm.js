 
'use strict'

const DB = require('./db');
const Game = require('./game');

const Response = require('./response');


const Kinds = [
    {
        name: "Human",
        info: "Humans are stinky and evil",
        playable: true,
        size: "125-240",
        attack: 0,
        defense: 10,
        damage: [1, 8],
        bodyparts: [ 'head', 'torso', 'arms', 'hands', 'legs', 'feet' ],
        attackmsgs: [
            new Response(
                "<attack>You hit {dobj.title} with your fist",
                "<defense>{player.title} hits you with their fist",
                "<action>{player.title} hits {dobj.title} with their fist"
            ),
        ],
    },
    {
        name: "Cat",
        info: "Cats are cuddly and fun",
        playable: true,
        size: "30-50",
        attack: 0,
        defense: 10,
        damage: [1, 8, 2],
        attackmsgs: [
            new Response(
                "<attack>You slash {dobj.title} with your claws",
                "<defense>{player.title} slashes you with their claws",
                "<action>{player.title} slashes {dobj.title} with their claws"
            ),
        ],
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
        playable: true,
        size: "80-140",
        attack: 0,
        defense: 10,
        damage: [1, 4, 0],
        attackmsgs: [
            new Response(
                "<attack>You hit {dobj.title} with your fist",
                "<defense>{player.title} hits you with their fist",
                "<action>{player.title} hits {dobj.title} with their fist"
            ),
            new Response(
                "<attack>You kick {dobj.title}",
                "<defense>{player.title} kicks you",
                "<action>{player.title} kicks {dobj.title}"
            ),
        ],
    },
    {
        name: "Goat",
        info: "Goat are people too",
        playable: false,
        size: "80-140",
        attack: 0,
        defense: 10,
        damage: [1, 4, 0],
        attackmsgs: [
            new Response(
                "<attack>You hit {dobj.title} with your hoof",
                "<defense>{player.title} hits you with their hoof",
                "<action>{player.title} hits {dobj.title} with their hoof"
            ),
        ],
    },
];

const Classes = [
    {
        name: "Warrior",
        playable: true,
    },
    {
        name: "Mage",
        playable: true,
    },
    {
        name: "Thief",
        playable: true,
    },
    {
        name: "Bard",
        playable: true,
    },
    {
        name: "Rogue",
        playable: true,
    },
];



function reinitRealmObjects(id) {
    let realm = DB.get_object(id++) || new DB.Classes.GameUtils();
    realm.name = 'RealmUtils';
    realm.kinds = [ ];
    realm.classes = [ ];
    Kinds.forEach((kind) => { realm.add_kind(kind); });
    Classes.forEach((cls) => { realm.add_class(cls); });



    let goat = DB.get_object(id++) || realm.create_npc({ kind: 'Goat', class: 'Fighter' });
    goat.name = 'a goat';
    goat.body.state = 'alive';
    goat.body.hp = goat.body.maxhp;
    goat.body.respawntime = 300000;
    goat.moveto(DB.get_object(52), 'force');


    let sword = DB.get_object(id++) || new DB.Classes.WieldableItem();
    sword.name = 'sword';
    sword.damage = [1, 8, 1];
    sword.attackmsgs = [ new Response(
        "<attack>You slice {dobj.title} with your sword",
        "<defense>{player.title} slices you with their sword",
        "<action>{player.title} slices {dobj.title} with their sword"
    )];
    sword.moveto(DB.get_object(52), 'force');

    let bag = DB.get_object(id++) || new DB.Classes.Container();
    bag.name = 'magic bag';
    bag.aliases = [ "bag" ];
    bag.description = "It's a magical bag that can hold anything!";
    bag.moveto(DB.get_object(52), 'force');

    let vm = DB.get_object(id++) || new DB.Classes.VendingMachine();
    vm.name = 'vending machine';
    vm.aliases = [ "machine" ];
    vm.description = "A vending machine with all sorts of goodies inside.";
    vm.items = [ sword ];
    vm.moveto(DB.get_object(52), 'force');
}

module.exports = {
    reinitRealmObjects,
};

