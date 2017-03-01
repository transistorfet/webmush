
'use strict';

let World = require('./world');


const onConnect = function (ws, req, next)
{
    if (!req.isAuthenticated()) {
        ws.close(4001, "Authentication Denied");
    }
    else {
        console.log('websocket connection');
        if (!req.user.player || req.user.player < 0 || req.user.player >= World.Objects.length || !(World.Objects[req.user.player] instanceof World.Player)) {
            console.log("Error: invalid player number");
            ws.close(4002, "Invalid Player");
            return;
        }

        ws.player = World.Objects[req.user.player];

        let connection = {
            send_log(text) {
                console.log("WS TX", text);
                ws.send(JSON.stringify({ type: 'log', text: text }));
            },
            send_json(data) {
                console.log("WS TX", data);
                ws.send(JSON.stringify(data));
            }
        };

        ws.player.connect(connection);

        ws.on('close', function (msg) {
            console.log('websocket connection lost for ', ws.player);
            if (ws.player)
                ws.player.disconnect(connection);
        });

        ws.on('message', function (msg) {
            console.log("WS RX", msg);
            try {
                let res = onMsg(ws, JSON.parse(msg));
                if (res)
                    ws.send(JSON.stringify(res));
            }
            catch (e) {
                console.log(e.stack);
            }
        });

    }
};

const onMsg = function (ws, msg)
{
    let args = { player: ws.player, text: msg.text };

    if (msg.type == 'connect') {
        ws.player.update_view();
    }
    else if (msg.type == 'say') {
        ws.player.location.say(args);
    }
    else if (msg.type == 'emote') {
        ws.player.location.emote(args);
    }
    else if (msg.type == 'go') {
        ws.player.location.go(args);
    }
    else if (msg.type == 'look') {
        let item = ws.player.match_object(msg.text);

        if (item) {
            ws.player.tell_msg({
                type: 'update',
                section: 'details',
                details: item.get_view(ws.player),
            });
        }
        else {
            ws.player.tell_msg({
                type: 'log',
                text: "You don't see that here."
            });
        }
    }
    else if (msg.type == 'do') {
        let item, verbs;

        if (msg.id && msg.id >= 0 && msg.id < World.Objects.length)
            item = World.Objects[msg.id];
        else if (msg.text) {
            item = ws.player.match_object(msg.text);
        }

        if (item) {
            if (item.can_do(ws.player, msg.verb))
                item[msg.verb].apply(item, [args]);
            else
                ws.player.tell("You can't do that");
        }
        else {
            if (ws.player.can_do(ws.player, msg.verb))
                ws.player[msg.verb].apply(ws.player, [args]);
            else if (ws.player.location.can_do(ws.player, msg.verb))
                ws.player.location[msg.verb].apply(ws.player.location, [args]);
            else
                ws.player.tell("I don't understand that.");
        }
    }
    else if (msg.type == 'help') {
        ws.player.tell("Commands: " + ws.player.verbs_for(ws.player, true).concat(ws.player.location.verbs_for(ws.player, true)).join(', '));
    }

    return;
};

module.exports = onConnect;

