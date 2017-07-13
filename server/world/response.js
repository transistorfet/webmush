 
'use strict'

const DB = require('./db');

class Response {
    constructor(first, second, third) {
        if (typeof first == 'object') {
            this.first = first.first;
            this.second = first.second;
            this.third = first.third;
        }
        else {
            if (third === undefined) {
                third = second;
                second = undefined;
            }

            this.first = first;
            this.second = second;
            this.third = third;
        }
    }

    tell_all(args) {
        if (this.first)
            args.player.tell(args.player.format(this.first, args).capitalize());
        if (this.second && args.dobj)
            args.dobj.tell(args.dobj.format(this.second, args).capitalize());

        let excludes = [ ];
        if (this.third) {
            if (this.first) excludes.push(args.player);
            if (this.second) excludes.push(args.dobj);
            args.player.location.tell_all_but(excludes, args.player.format(this.third, args).capitalize());
        }
    }
}

DB.register(Response);
module.exports = Response;

