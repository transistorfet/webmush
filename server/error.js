 
'use strict';


class Validation extends Error {
    constructor(messages) {
        super(messages[0]);
        this.messages = typeof messages == 'string' ? [ messages ] : messages;
    }
};

class Response {
    constructor(you, them, others) {
        if (others === undefined) {
            others = them;
            them = undefined;
        }

        this.you = you;
        this.them = them;
        this.others = others;
    }
};

module.exports = {
    Validation,
};

