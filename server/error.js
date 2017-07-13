 
'use strict';


class Validation extends Error {
    constructor(messages) {
        super(messages[0]);
        this.messages = typeof messages == 'string' ? [ messages ] : messages;
    }
};

module.exports = {
    Validation,
};

