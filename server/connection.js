
'use strict';

let World = require('./world');


const onConnect = function (ws, req, next)
{
    if (!req.isAuthenticated()) {
        ws.close(4001, "Authentication Denied");
    }
    else {
        console.log('websocket connection');
        if (!req.user.player || req.user.player < 0 || req.user.player >= World.Objects.length) {
            console.log("Error: invalid player number");
            ws.close(4002, "Invalid Player");
            return;
        }

        ws.player = World.Objects[req.user.player];

        ws.player.connect({
            send_log(text) {
                console.log("WS TX", text);
                ws.send(JSON.stringify({ type: 'log', text: text }));
            },
            send_json(data) {
                console.log("WS TX", data);
                ws.send(JSON.stringify(data));
            }
        });

        ws.on('message', function (msg) {
            console.log("WS RX", msg);
            let res = onMsg(ws, JSON.parse(msg));
            if (res)
                ws.send(JSON.stringify(res));
        });
    }
};

const onMsg = function (ws, msg)
{
    if (msg.type == 'connect') {
/*
        return {
            type: 'update',
            player: ws.player.get_view(ws.player),
            location: ws.player.location.get_view(ws.player),
        };
*/
        ws.player.update_view();
    }
    else if (msg.type == 'input') {
        console.log("Input", msg.text);
        let args = { player: ws.player, text: msg.text };

        if (args.text.indexOf('/') == 0) {
            console.log('Unknown command');
        }
        else
            ws.player.location.say(args);
    }
    else if (msg.type == 'go') {
        let args = { player: ws.player, text: msg.text };
        ws.player.location.go(args);
        /*
        return {
            type: 'update',
            player: ws.player.get_view(ws.player),
            location: ws.player.location.get_view(ws.player),
        };
        */
        ws.player.update_view();
    }

    return;
};

module.exports = onConnect;

