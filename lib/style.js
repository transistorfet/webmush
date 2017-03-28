
'use strict';

const fs = require('fs');
const path = require('path');


const generateCSS = function (style, limit) {
    limit = limit ? limit : '';
    if (typeof style == 'string')
        return limit + '{ ' + style + ' }';

    let rules = [ ];
    if (style.box)
        rules.push(limit + ' { ' + style.box + ' }');
    if (style.title)
        rules.push(limit + ' .title { ' + style.title + ' }');
    if (style.description)
        rules.push(limit + ' .description { ' + style.description + ' }');
    if (style.font) {
        let m = style.font.match(/^\/.*\/(\w+?).\w+$/);
        if (m) {
            rules.push('@font-face { font-family: "' + m[1] + '"; src: url("' + style.font + '"); }');
            rules.push(limit + ' { ' + 'font-family: "' + m[1] + '";' + ' }');
        }
        else
            rules.push(limit + ' { ' + 'font-family: "' + style.font + '";' + ' }');
    }
    if (style.background) {
        let attrs = { }
        attrs['background-image'] = 'url("' + style.background + '")';
        if (style.backgroundPos)
            attrs['background-position'] = style.backgroundPos;
        rules.push(generateRule(attrs, limit));
    }
    return rules.join('\n');
};

const generateRule = function (attributes, limit) {
    return (limit ? limit : '') + ' { ' + Object.keys(attributes).map(function (key) {
        return key + ': ' + attributes[key] + ';';
    }).join(' ') + ' } ';
};

const getCSS = function (style, limit) {
    if (typeof style == 'object')
        return generateCSS(style, limit);
    else if (typeof style == 'string') {
        if (style.startsWith('/media'))
            return fs.readFileSync(path.join(__dirname, '../data', style), 'utf8');
        else
            return style;
    }
}


module.exports = {
    generateCSS,
    getCSS,
};

