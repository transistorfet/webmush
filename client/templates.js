
'use strict';

const m = require('mithril');

const websocket = require('./websocket');

const World = require('./world/model');
 
const Templates = require('../lib/templates');


websocket.on('msg', function (msg) {
    if (msg.type == 'template') {
        var template = eval("(" + msg.template + ")");
        Templates.set(msg.name, template);
    }
    else
        return;
    m.redraw();
});

Templates.setFetcher(function (name) {
    websocket.send({ type: 'template', name: name });
    return null;
});


