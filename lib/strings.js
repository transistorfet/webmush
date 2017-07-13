 
'use strict'

let matchFirst = /^((?:\W*?<.+?>)*\W*)(\w)(.*)$/;

String.prototype.capitalize = function () {
    let m = this.match(matchFirst);
    if (!m || !m[2])
        return this;
    else
        return m[1] + m[2].toUpperCase() + (m[3] ? m[3] : '');
    return this.length > 0 ? this.charAt(0).toUpperCase() + this.slice(1) : '';
};

String.prototype.capitalizeAll = function () {
    return this.split().map((word) => { return word.charAt(0).toUpperCase() + this.slice(1); }).join(' ');
};


let matchFormat = /{([\^-])?([\w.]+)}/g;
// TODO should you make this a static method of String, or a proto method, but .call(this, ...) should still work
function format(text, args) {
    var self = this;
    return text.replace(matchFormat, function(match, mod, name) { 
        var parts = name.split('.');
        var value = undefined;
        for (var i = 0; i < parts.length; i++) {
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
}

module.exports = {
    format,
};

