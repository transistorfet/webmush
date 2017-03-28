
'use strict';

const Strings = {

    vowels: ['a','e','i','o','u'],

    properName(name) {
        if (name.toLowerCase().startsWith('the'))
            return name;
        else if (Strings.vowels.indexOf(name.charAt(0).toLowerCase()) != -1)
            return "an " + name;
        else
            return "a " + name;
    },

    split_preposition(text) {
        return text.match(parse);
    },

    prepositions: [
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
    ],

};

const parse = new RegExp('^\\s*(.*?)\\s+(' + Strings.prepositions.join('|') + ')\\s+(.*?)\\s*$', 'i');

module.exports = Strings;

