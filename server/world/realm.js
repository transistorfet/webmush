 
'use strict'

const DB = require('./db');
const Game = require('./game');



const Kinds = [
    {
        name: "Human",
        info: "Humans are stinky and evil",
        playable: true,
        size: "125-240",
        attack: 0,
        defense: 10,
        damage: [1, 8],
    },
    {
        name: "Cat",
        info: "Cats are cuddly and fun",
        playable: true,
        size: "30-50",
        attack: 0,
        defense: 10,
        damage: [1, 8, 2],
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
    },
    {
        name: "Goat",
        info: "Goat are people too",
        playable: false,
        size: "80-140",
        attack: 0,
        defense: 10,
        damage: [1, 4, 0],
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
    realm.kinds = Kinds;
    realm.classes = Classes;

    let goat = DB.get_object(id++) || realm.create_npc({ kind: 'Goat', class: 'Fighter' });
    goat.name = 'A Goat';
    goat.state = 'alive';
    goat.hp = goat.maxhp;
    goat.moveto(DB.get_object(52));


    let sword = DB.get_object(id++) || new DB.Classes.WieldableItem();
    sword.name = 'sword';
    sword.damage = [1, 8, 1];
    sword.moveto(DB.get_object(52));

}

module.exports = {
    reinitRealmObjects,
};

