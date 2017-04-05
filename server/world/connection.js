
'use strict';

const DB = require('./db');
const Root = require('./root');
const Error = require('../error');


class Connection {
    constructor(ws) {
        this.ws = ws;
        this.$nosave = true;
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
        if (!req.user.player) {
            console.log("Error: invalid player number");
            ws.close(4002, "Invalid Player");
            return;
        }

        let connection = new Connection(ws);

        ws.player = req.user.player;
        ws.player.connect(connection);

        ws.on('close', function (msg) {
            console.log('websocket connection lost for', ws.player ? ws.player.name + ' (#' + ws.player.id + ')' : 'unconnected player');
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
    let args = { player: ws.player, text: msg.text ? msg.text : '' };
    if (msg.id) {
        args.dobj = DB.get_object(msg.id);
        if (!args.dobj)
            return args.player.tell("I don't see an object here with id #"+msg.id);
    }


    if (msg.type == 'connect') {
        ws.player.update_view();
    }
    else if (msg.type == 'say') {
        ws.player.location.say(args);
    }
    else if (msg.type == 'emote') {
        ws.player.location.emote(args);
    }
    else if (msg.type == 'do') {
        args.verb = msg.verb.toLowerCase();

        try {
            if (msg.id) {
                if (!args.dobj || !args.dobj.do_verb_for(args.player, args.verb, args))
                    args.player.tell("I don't know how to do that.");
            }
            else {
                if (msg.text)
                    Root.parse_preposition(args, msg.text);

                if (!args.player.do_verb_for(args.player, args.verb, args))
                    if (!args.player.location.do_verb_for(args.player, args.verb, args))
                        if (!args.dobj || !args.dobj.do_verb_for(args.player, args.verb, args))
                            if (!args.iobj || !args.iobj.do_verb_for(args.player, args.verb, args))
                                args.player.tell("I don't know how to do that.");
            }
        }
        catch (e) {
            catchError(e, args.player);
        }
    }
    else if (msg.type == 'edit') {
        if (!msg.id) return;

        try {
            args.dobj.edit_by(args.player, msg.attr, msg.text);
            args.player.update_view();
        }
        catch (e) {
            catchError(e, args.player);
        }
    }
    else if (msg.type == 'respond') {
        if (!msg.id) return;
        if (msg.cancel)
            return args.player.tell_msg({ type: 'prompt-update', close: true, seq: msg.seq });
        args.response = msg.response;

        try {
            if (!args.dobj.do_verb_for(args.player, msg.respond, args))
                return args.player.tell("You can't respond to that");
            args.player.tell_msg({ type: 'prompt-update', close: true, seq: msg.seq });
        }
        catch (e) {
            catchError(e, args.player, msg.seq);
        }
    }
    else if (msg.type == 'get') {
        if (msg.section == 'prefs') {
            let data = { type: 'prefs', prefs: args.player.get_prefs() };
            console.log("WS TX", data);
            ws.send(JSON.stringify(data));      // We only send to the requesting connection, and not all user connections
        }
    }

    return;
};

const catchError = function (e, player, seq) {
    if (typeof e == 'string')
        player.tell(e);
    else if (e instanceof Error.Validation)
        player.tell_msg({ type: 'prompt-update', errors: e.messages, seq: seq });
    else
        throw e;
};

module.exports = onConnect;

