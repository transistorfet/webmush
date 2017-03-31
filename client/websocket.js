
'use strict';
 
const m = require('mithril');

const MAX_ERRORS = 6;
const RECONNECT_TIMEOUT = 3000;

let ws = null;
let errors = 0;
let callbacks = {
    'open': [ ],
    'msg': [ ],
    'close': [ ],
    'error': [ ],
};

const connect = function ()
{
    if (ws)
        return;

    console.log('opening websocket connection');
    ws = new WebSocket('ws://' + window.location.host + '/socket');

    ws.addEventListener('error', function (msg) {
        console.log("error", msg);
        errors += 1;
    });

    ws.addEventListener('open', onOpen);
    ws.addEventListener('close', onClose);
    ws.addEventListener('message', onMsg);
}

const disconnect = function ()
{
    if (ws)
        ws.close();
    ws = null;
};

const onOpen = function (event) {
    console.log("websocket connection open");

    callbacks['open'].map(function (func) {
        func(event, ws);
    });
};

const onClose = function (event) {
    callbacks['close'].map(function (func) {
        func(event, ws);
    });

    console.log("websocket connection closed", event);
    ws = null;
    if (event.code == 4001)
        m.route.set('/login');
    else if (event.code == 1001)
        return;
    else {
        errors += 1;
        if (errors <= MAX_ERRORS) {
            setTimeout(function () {
                connect();
            }, RECONNECT_TIMEOUT);
        }
        else {
            alert("Error connecting to server");
        }
    }
};

const onMsg = function (event) {
    let msg = JSON.parse(event.data);
    callbacks['msg'].map(function (func) {
        func(msg, ws);
    });
};

const send = function (msg) {
    ws.send(JSON.stringify(msg));
}

const on = function (signal, func) {
    if (signal in callbacks)
        callbacks[signal].push(func);
};

const isConnected = function () {
    return ws ? true : false;
}

module.exports = {
    connect,
    send,
    on,
    isConnected,
};
 
