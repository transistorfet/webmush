
'use strict';
 
const m = require('mithril');

let ws = null;
let errors = 0;
let middleware = [ ];

const connect = function ()
{
    console.log('opening websocket connection');
    ws = new WebSocket('ws://' + window.location.host + '/socket');

    ws.addEventListener('error', function (m) {
        console.log("error");
        errors += 1;
    });

    ws.addEventListener('open', function (m) {
        console.log("websocket connection open");
        send({ type: 'connect' });
    });

    ws.addEventListener('close', onClose);

    ws.addEventListener('message', onMsg);

    //setTimeout(function () {
    //    ws.send("My Thing");
    //}, 10000);
}

const onClose = function (msg) {
    console.log("websocket connection closed", msg);
    if (msg.code == 4001)
        m.route.set('/login');
    else if (msg.code == 1001)
        return;
    else {
        if (errors <= 5) {
            setTimeout(function () {
                connect();
            }, 2000);
        }
    }
};

const onMsg = function (msg) {
    let response = JSON.parse(msg.data);
    middleware.map(function (func) {
        func(ws, response);
    });
};

const send = function (msg) {
    ws.send(JSON.stringify(msg));
}

const use = function (func) {
    middleware.push(func);
};

module.exports = {
    connect,
    send,
    use,
};
 
