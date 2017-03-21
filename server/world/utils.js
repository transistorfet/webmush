
'use strict';


String.prototype.capitalize = function () {
    return this.length > 0 ? this.charAt(0).toUpperCase() + this.slice(1) : '';
};

String.prototype.capitalizeAll = function () {
    return this.split().map((word) => { return word.charAt(0).toUpperCase() + this.slice(1); }).join(' ');
};


let vowels = ['a','e','i','o','u'];
const properName = function (name) {
    if (name.toLowerCase().startsWith('the'))
        return name;
    else if (vowels.indexOf(name.charAt(0).toLowerCase()) != -1)
        return "an " + name;
    else
        return "a " + name;
};


const parseCommand = function(player, verb, text) {
    let args = { player: player, text: text, verb: verb.toLowerCase() };
    parseObjects(args, text);
    return args;
};

const parseObjects = function (args, text) {
    let m = text.match(parse);
    if (!m) {
        args.dobjstr = text;
        args.dobj = args.player.find_object(text);
    }
    else {
        args.dobjstr = m[1];
        args.prep = m[2].toLowerCase();
        args.iobjstr = m[3];
        args.dobj = args.player.find_object(args.dobjstr);
        args.iobj = args.player.find_object(args.iobjstr);
    }
};


const prepositions = [
    "with",
    "using",
    "at",
    "to",
    "in front of",
    "in",
    "inside",
    "into",
    "on top of",
    "on",
    "onto",
    "upon",
    "out of",
    "from inside",
    "from",
    "over",
    "through",
    "under",
    "underneath",
    "beneath",
    "behind",
    "beside",
    "for",
    "about",
    "is",
    "as",
    "off",
    "off of",
    "of",
];

let parse = new RegExp('^\\s*(.*?)\\s+(' + prepositions.join('|') + ')\\s+(.*?)\\s*$', 'i');


module.exports = {
    properName,
    parseCommand,
    parseObjects,
};

