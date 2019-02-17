
'use strict';

const fs = require('fs');
const path = require('path');


let Objects = { };

const DB = {
    // TODO Maybe make Classes a more generic name?  Allow sublevels (DB.Basic.Player, DB.Game.Mortal)
    //objects: Objects,
    Classes: [ ],
    Named: [ ],
    mark: [ ],
    reservedObjects: 32,

    initialize(index, list) {
        //let keys = Object.keys(list);
        //for (let i = 0; i < keys.length; i++) {
        for (let key in list) {
            // TODO if you uncomment these, it will still not save the classes but will put a "2": null entry into the json file... so do we want classes to be objects?
            //Objects[index] = list[key];
            //Objects[index].id = index;
            //Objects[index]['$nosave'] = true;
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
        if (id && (!filter || (Objects[id] instanceof filter)))
            return Objects[id];
        return null;
    },

    set_object(id, obj) {
        if (id && Objects[id])
            throw "Error: request object id is already being used, " + id;
        if (id < 0)
            return id;
        obj.id = id ? id : DB.next_id();
        Objects[obj.id] = obj;
        return id;
    },

    del_object(obj) {
        Objects[obj.id] = null;
        //fs.unlinkSync(path.join(process.env.DATA_DIR, 'objects/'+this.id+'.json'));
        // TODO also delete media, or at least put it in an attic so that if the id is recycled, the new user can't access old content
        obj.id = -1;
    },

    next_id() {
        return Math.max.apply(null, Object.keys(Objects).filter((key) => { return !isNaN(key); })) + 1;
    },
/*
    next_id() {
        while (1) {
            let id = Math.floor(Math.random() * 100000);
            if (!Objects[id])
                return id;
        }
    },
*/

    loadObjects() {
        console.log("Loading Object DB");
        let start = Date.now();
        try {
            let data = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'objects/world.json'), 'utf8'));
            DB.parseData(data, data);

            for (let key in Objects) {
                if (Objects[key] && Objects[key].onLoad)
                    Objects[key].onLoad();
            }
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
                if (Objects[data['$ref']])
                    return Objects[data['$ref']];
                else
                    return DB.makeObject(recurse[data['$ref']], recurse);
                    //return DB.makeObject(getter(data['$ref']), getter);
                    //getter = function (id) { return data[id] };
            }
            else if (data['$type'] && data['id']) {
                // TODO having this here necessitates a garbage collection phase before saving, but leaving this out means only referenced objects will be loaded
                return DB.makeObject(recurse[data['id']], recurse);
            }
            else {
                let obj = data['$class'] ? new DB.Classes[data['$class']]({ $mode: 'load' }) : { };
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
        let id = data['id'];
        let typename = data['$type'];
        let pid = data['$prototype'] ? data['$prototype'] : null;
        if (!(typename in DB.Classes))
            throw "Load Error: Unable to load object with unregistered class " + typename;

        let obj;
        if (Objects[id])
            obj = Objects[id];
        else {
            //obj = new Objects[tid]({ $id: id, $mode: 'load' });
            obj = new DB.Classes[typename]({ $id: id, $mode: 'load' });
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
        //if (Objects.length <= DB.reservedObjects)
        //    return;     // don't save if we failed to load objects
        console.log("Saving Object DB -", new Date().toLocaleString());
        let start = Date.now();

        DB.mark = { };
        let list = { };
        for (let i in Objects) {
            if (Objects[i])
                list[i]  = DB.simplifyObject(Objects[i], true);
        }

        // Delete any unreferenced objects
        for (let i in Objects) {
            if (!DB.mark[i])
                console.log("UNREF", i);
            if (!DB.mark[i] && Objects[i] && Objects[i].recycle === true) {
                DB.del_object(this);
                delete list[i];
            }
        }
        let output = JSON.stringify(list, undefined, 2) + '\n';

        try {
            // TODO delete old backups
            let backup = fs.readFileSync(path.join(process.env.DATA_DIR, 'objects/world.json'), 'utf8');
            if (backup != output) {
                !fs.existsSync(path.join(process.env.DATA_DIR, 'objects/backup/')) && fs.mkdirSync(path.join(process.env.DATA_DIR, 'objects/backup/'));
                fs.renameSync(path.join(process.env.DATA_DIR, 'objects/world.json'), path.join(process.env.DATA_DIR, 'objects/backup/' + Math.floor(Date.now() / 1000) + '-world.json'));
            }
            else
                console.log('database unchanged');
        } catch (e) {
            console.log(e.stack);
        }

        try {
            fs.writeFileSync(path.join(process.env.DATA_DIR, 'objects/world.json'), output, 'utf8');
        } catch (e) {
            console.log(e.stack);
        }
        console.log("Save completed in " + (Date.now() - start) + "ms");
    },

    simplifyObject(value, noRef) {
        if (value === null || value['$nosave'])
            return null;
        else if (Array.isArray(value))
            return value.map((value) => { return DB.simplifyObject(value); });
        else if (typeof value == 'object') {
            if (value instanceof DB.Classes.Root && !noRef) {
                DB.mark[value.id] = true;
                return { $ref: value.id };
            }
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



process.on('exit', () => { if (!(process.exitCode < 0)) DB.saveObjects(); });

process.on('SIGINT', () => { process.exit(); });
process.on('SIGTERM', () => { process.exit(); });
process.on('SIGQUIT', () => { process.exit(); });
process.on('SIGUSR2', () => { process.exit(); });

process.on('uncaughtException', (err) => {
    console.log(err);
    if (err.stack)
        console.log(err.stack);
    process.exit(-1);
});

const savePeriodically = function () {
    setTimeout(function () {
        DB.saveObjects();
        savePeriodically();
    }, 600000);
};
savePeriodically();



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

