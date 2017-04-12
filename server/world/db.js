
'use strict';

const fs = require('fs');


let Objects = [ ];

const DB = {
    // TODO Maybe make Classes a more generic name?  Allow sublevels (DB.Basic.Player, DB.Game.Mortal)
    //objects: [ ],
    Classes: [ ],
    Named: [ ],
    mark: [ ],
    reservedObjects: 32,

    initialize(index, list) {
        //let keys = Object.keys(list);
        //for (let i = 0; i < keys.length; i++) {
        for (let key in list) {
            Objects[index] = list[key];
            Objects[index].id = index;
            // TODO also add DB[key] = list[key] ???
            //DB[key] = list[key];
            DB.Classes[key] = list[key];
            index++;
        }
    },

    register(cls) {
        if (DB.Classes[cls.name] == cls)
            console.log("WARN: redefining class,", cls.name);
        DB.Classes[cls.name] = cls;
    },

    define(name, obj) {
        if (DB.Named[name] == obj)
            console.log("WARN: redefining named object,", name);
        DB.Named[name] = obj;
    },

    get_object(id, filter) {
        if (id && id >= 0 && id < Objects.length && (!filter || (Objects[id] instanceof filter)))
            return Objects[id];
        return null;
    },

    set_object(id, obj) {
        if (id && Objects[id])
            throw "Error: request object id is already being used, " + id;
        if (id < 0)
            return id;
        obj.id = id ? id : Objects.length;
        Objects[obj.id] = obj;
        return id;
    },

    del_object(obj) {
        Objects[obj.id] = null;
        //fs.unlinkSync('data/objects/'+this.id+'.json');
        // TODO also delete media, or at least put it in an attic so that if the id is recycled, the new user can't access old content
        obj.id = -1;
    },


    loadObjects() {
        console.log("Loading Object DB");
        let start = Date.now();
        try {
            let data = JSON.parse(fs.readFileSync('data/objects/world.json', 'utf8'));
            DB.parseData(data, data);

            Objects.forEach(function (obj) {
                if (obj && obj.onLoad)
                    obj.onLoad();
            });
        }
        catch (e) {
            console.log(e.stack);
            Objects = null;
            throw e;
        }
        console.log("Load completed in " + (Date.now() - start) + "ms");
    },

    parseData(data, recurse) {
        if (data === null)
            return data;
        else if (Array.isArray(data))
            return data.map((value) => { return DB.parseData(value, recurse); });
        else if (typeof data === 'string' && data.match(/^function /))
            return eval("(" + data + ")");
        else if (typeof data === 'object') {
            if (data['$ref']) {
                if (data['$ref'] < Objects.length && Objects[data['$ref']])
                    return Objects[data['$ref']];
                else
                    return DB.makeObject(recurse[data['$ref'] - DB.reservedObjects], recurse);
                    //return DB.makeObject(getter(data['$ref']), getter);
                    //getter = function (id) { return data[id - DB.reservedObjects] };
            }
            else if (data['$type'] && data['id']) {
                // TODO having this here necessitates a garbage collection phase before saving, but leaving this out means only referenced objects will be loaded
                return DB.makeObject(recurse[data['id'] - DB.reservedObjects], recurse);
            }
            else {
                let obj = data['$class'] ? new DB.Classes[data['$class']]() : { };
                for (let k in data) {
                    obj[k] = DB.parseData(data[k], recurse);
                }
                return obj;
            }
        }
        else
            return data;
    },

    makeObject(data, recurse) {
        let id = parseInt(data['id']);
        //let tid = parseInt(data['$type']);
        let typename = data['$type'];
        let pid = data['$prototype'] ? parseInt(data['$prototype']) : null;
        if (!(typename in DB.Classes))
            throw "Load Error: Unable to load object with unregistered class " + typename;

        let obj;
        if (Objects[id])
            obj = Objects[id];
        else {
            //obj = new Objects[tid]({ id: id });
            obj = new DB.Classes[typename]({ id: id });
            if (Objects[id] != obj)
                throw "Load Error: object id ignored by constructor for #" + id;
            if (pid !== null)
                Object.setPrototypeOf(obj, Objects[pid]);
        }

        for (let k in data)
            obj[k] = DB.parseData(data[k], recurse);
        //obj.onLoad();

        return obj;
    },



    saveObjects(){
        if (Objects.length <= DB.reservedObjects)
            return;     // don't save if we failed to load objects
        console.log("Saving Object DB -", new Date().toLocaleString());
        let start = Date.now();

        DB.mark = [ ];
        let list = [ ];
        for (let i = DB.reservedObjects; i < Objects.length; i++) {
            if (Objects[i])
                list.push(DB.simplifyObject(Objects[i], true));
        }

        // Delete any unreferenced objects
        for (let i = DB.reservedObjects; i < Objects.length; i++) {
            if (!DB.mark[i])
                console.log("UNREF", i);
            if (!DB.mark[i] && Objects[i] && Objects[i].recycle === true) {
                DB.del_object(this);
                delete list[i - DB.reservedObjects];
            }
        }
        let output = JSON.stringify(list, undefined, 2) + '\n';

        try {
            // TODO delete old backups
            fs.renameSync('data/objects/world.json', 'data/objects/backup/' + Math.floor(Date.now() / 1000) + '-world.json');
            fs.writeFileSync('data/objects/world.json', output, 'utf8');
        }
        catch (e) {
            console.log(e.stack);
        }
        console.log("Save completed in " + (Date.now() - start) + "ms");
    },

    simplifyObject(value, noRef) {
        if (Array.isArray(value))
            return value.map((value) => { return DB.simplifyObject(value); });
        else if (typeof value == 'object') {
            if (value instanceof DB.Classes.Root && !noRef) {
                DB.mark[value.id] = true;
                return { $ref: value.id };
            }
            else if (value === null || value['$nosave'])
                return null;
            else {
                let jsonobj = { };
                if (value instanceof DB.Classes.Root) {
                    jsonobj['$type'] = value.constructor.name;
                    jsonobj['$prototype'] = Object.getPrototypeOf(value).id;
                    DB.mark[jsonobj['$type']] = true;
                    DB.mark[jsonobj['$prototype']] = true;
                }
                else if (value.constructor && value.constructor != Object && value.constructor.name) {
                    if (!DB.Classes[value.constructor.name])
                        console.log("WARN: saving object with a registered class: " + value.constructor.name);
                    jsonobj['$class'] = value.constructor.name;
                    DB.mark[jsonobj['$class']] = true;
                }

                for (let key in value) {
                    if (!value.hasOwnProperty(key) || key[0] == '$')
                        continue;
                    jsonobj[key] = DB.simplifyObject(value[key]);
                }
                return jsonobj;
            }
        }
        else if (typeof value == 'function')
            return value.toString();
        else
            return value;
    },
};



process.on('exit', () => { DB.saveObjects(); });
process.on('SIGINT', () => { process.exit(); });
process.on('SIGUSR2', () => { process.exit(); });

const savePeriodically = function () {
    setTimeout(function () {
        DB.saveObjects();
        savePeriodically();
    }, 600000);
};
savePeriodically();


Objects = Objects.concat(Array(DB.reservedObjects - Objects.length).fill(null));    // Reserve space for future class objects

/*
const ObjectRef = function (id) {
    return new Proxy({ id }, {
        get: function (target, name) {
            return Objects[target.id][name];
        },
    });
};

let location = ObjectRef(9);
console.log(location.name, location);
*/


module.exports = DB;

