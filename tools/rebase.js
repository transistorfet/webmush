 
'use strict';

const fs = require('fs');

let reserved = 32;

let data = JSON.parse(fs.readFileSync('world.json', 'utf8'));
let rebase = reserved - data[0].id;

function parseData(data, recurse) {
    if (data === null)
        return;
    else if (Array.isArray(data))
        data.map((value) => { return parseData(value, recurse); });
    else if (typeof data === 'object') {
        if (data['$ref'])
            data['$ref'] += rebase;
        else {
            if (data['$type'] && data['id'])
                data['id'] += rebase;
            for (let k in data)
                parseData(data[k], recurse);
        }
    }
}

parseData(data);

fs.writeFileSync('world-rebase.json', JSON.stringify(data, undefined, 2) + '\n', 'utf8');


