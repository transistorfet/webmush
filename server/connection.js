
'use strict';

let World = require('./world');
let Utils = require('./utils');

class Connection {
    constructor(ws) {
        this.ws = ws;
    }

    send_log(text) {
        console.log("WS TX", text);
        this.ws.send(JSON.stringify({ type: 'log', text: text }));
    }

    send_json(data) {
        console.log("WS TX", data);
        this.ws.send(JSON.stringify(data));
    }
}


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
            $nosave: true,
            send_log(text) {
                console.log("WS TX", text);
                ws.send(JSON.stringify({ type: 'log', text: text }));
            },
            send_json(data) {
                console.log("WS TX", data);
                ws.send(JSON.stringify(data));
            }
        };
        // TODO this causes a circular references when saving player object because the ws is stored in the object rather than as a closure like the above one does
        //let connection = new Connection(ws);

        ws.player.connect(connection);

        ws.on('close', function (msg) {
            console.log('websocket connection lost for', ws.player ? ws.player.name + ' (' + ws.player.id + ')' : 'unconnected player');
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
        if (msg.id && msg.id >= 0 && msg.id < World.Objects.length)
            args.dobj = World.Objects[msg.id];
        ws.player.location.go(args);
    }
    else if (msg.type == 'do') {
        args.verb = msg.verb = msg.verb.toLowerCase();

        if (msg.id && msg.id >= 0 && msg.id < World.Objects.length)
            args.dobj = World.Objects[msg.id];
        else if (msg.text)
            Utils.parseObjects(args, msg.text);

        if (args.dobj && args.dobj.can_do(args.player, msg.verb))
            args.dobj[msg.verb].apply(args.dobj, [args]);
        else if (args.player.can_do(args.player, msg.verb))
            args.player[msg.verb].apply(args.player, [args]);
        else if (args.player.location.can_do(args.player, msg.verb))
            args.player.location[msg.verb].apply(args.player.location, [args]);
        else
            args.player.tell("I don't understand that.");
    }
    else if (msg.type == 'edit') {
        if (!msg.id || msg.id < 0 || msg.id >= World.Objects.length)
            args.player.tell("Invalid object provided for attribute edit");
        let item = World.Objects[msg.id];

        try {
            item.edit_by(args.player, msg.attr, msg.text);
            args.player.update_view();
        }
        catch (e) {
            args.player.tell(e);
        }
    }
    else if (msg.type == 'help') {
        ws.player.tell("Commands: " + ws.player.verbs_for(ws.player, true).concat(ws.player.location.verbs_for(ws.player, true)).join(', '));
    }

    return;
};

module.exports = onConnect;

