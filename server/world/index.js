
'use strict';

const DB = require('./db');
const Root = require('./root');

const Basic = require('./basic');
const Game = require('./game');


/*
let InitialObjects = {
    Root,
    Thing,
    Being,
    Player,
    Room,
    Exit,
    Item,
    UseableItem,
};

DB.initialize(0, InitialObjects);
*/

DB.initialize(0, { Root });
DB.initialize(1, Basic);
DB.initialize(Object.keys(Basic).length + 1, Game);



//
// Initialize Objects
//
function initTestObjects() {
    let limbo = new Basic.Room();
    limbo.name = "Limbo";
    limbo.description = "You are floating in a void of blackness.  You cannot make out anything.";
    limbo.onLoad = function () { DB.define('Limbo', this); }

    let lobby = new Basic.Room();
    lobby.name = "The Lobby";
    lobby.description = "You are in an empty hotel lobby.  There isn't anything here yet";
    lobby.onLoad = function () { DB.define('Lobby', this); }

    let wizard = new Basic.Player();
    wizard.isWizard = true;
    wizard.title = "Wizzy the Wizard";
    wizard.description = "A short person with a long white beard and a pointy blue hat.";
    wizard.password = "$2a$10$Xgg6g4inK/qzcPUtPC40x..vNyDw7z3R/tveviQmquFEi1PnbeIlu";

    let lowely = new Basic.Player();
    lowely.title = "Lowely Worm";
    lowely.description = "An anthropormorphic worm with a green hat, and a single big brown boot.";
    lowely.password = "$2a$10$Xgg6g4inK/qzcPUtPC40x..vNyDw7z3R/tveviQmquFEi1PnbeIlu";

    let coatcheck = new Basic.Room();
    coatcheck.name = "The Coat Check";
    coatcheck.description = "There is a counter here for checking your coats and belongings, but no one as behind the counter.";

    lobby.link_rooms('west', coatcheck);

    let doohickey = new Basic.Item();
    doohickey.name = "Doohickey";
    doohickey.description = "It's a general purpose tool for anything you want.";
    doohickey.moveto(wizard, 'force');

    let partybutton = new Basic.UseableItem();
    partybutton.name = "The Party Button";
    partybutton.description = "It's a small box with a big red button labelled \"Party\".";
    partybutton.msg_use_you = "You press the party button.  <b><red>It explodes into a burst of lights and music;</b> <green>a disc ball decends from the ceiling and everybody starts partying.";
    partybutton.msg_use_others = "{player.title} pulls out a big button and presses it.  <b><red>It explodes into a burst of lights and music;</b> <green>a disc ball decends from the ceiling and everybody starts partying.";
    partybutton.moveto(wizard, 'force');

    let ducky = new Basic.Being();
    ducky.name = "Ducky";
    ducky.description = "An small duck is quacking and waddling around here.";
    ducky.moveto(lobby, 'force');
    ducky.onLoad = function () { this.annoy() };
    ducky.annoy = function (args) {
        setTimeout(function () {
            if (this.location)
                this.location.say({ player: this, text: "Quack ".repeat(1 + Math.floor(Math.random() * 3)).trim() });
            this.annoy();
        }.bind(this), 30000 + Math.random() * 30000);
    };
    ducky.annoy();
}
//initTestObjects();




DB.loadObjects();
//DB.saveObjects();

const Realm = require('./realm');
Realm.reinitRealmObjects(68);

/*
// TODO testing a mechanism of finding verbs on an object
function getMethods(obj) {
    if (!obj)
        return [];

    //console.log(obj, obj.name);
    let list = Object.getOwnPropertyNames(obj).reduce(function (acc, key) {
        if (typeof obj[key] == 'function')
            acc.push(key);
        return acc;
    }, []);

    let proto = Object.getPrototypeOf(obj);
    if (proto && proto != Root && proto != Object)
        return list.concat(getMethods(proto));
    //console.log("CON", Object.keys(obj.constructor));
    //if (obj.constructor && obj.constructor != Object) {
    //    return list.concat(getMethods(obj.constructor.prototype));
    //}
    return list;
}

console.log("LIST", getMethods(DB.get_object(52)));
//let obj = DB.get_object(52);
//console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(obj)), obj.constructor.prototype, Object.getPrototypeOf(obj.constructor.prototype), Object.getPrototypeOf(obj.constructor), obj.constructor.prototype.verbs_for);
*/

module.exports = Object.assign({ DB, Root }, Basic);

