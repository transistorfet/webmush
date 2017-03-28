 
'use strict'


String.prototype.capitalize = function () {
    return this.length > 0 ? this.charAt(0).toUpperCase() + this.slice(1) : '';
};

String.prototype.capitalizeAll = function () {
    return this.split().map((word) => { return word.charAt(0).toUpperCase() + this.slice(1); }).join(' ');
};

module.exports = {

    // TODO should you make this a static method of String, or a proto method, but .call(this, ...) should still work
    format(text, args) {
        let self = this;
        return text.replace(/{([\^-])?([\w.]+)}/g, function(match, mod, name) { 
            let parts = name.split('.');
            let value = undefined;
            for (let i = 0; i < parts.length; i++) {
                if (!value && parts[i] == 'this')
                    value = self;
                else if (!value && typeof args[parts[i]] != 'undefined')
                    value = args[parts[i]];
                else if (value && typeof value[parts[i]] != 'undefined')
                    value = value[parts[i]];
                else
                    return match;
            }
            if (mod == '-')
                return value.toLowerCase();
            else if (mod == '^')
                return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : '';
            else
                return value;
        });
    },

};

