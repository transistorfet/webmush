 
'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');

const QUOTA = 32 * Math.pow(2, 20);     // 32MB


class MediaDB {
    constructor() {
        this.data = { };

        let files = fs.readdirSync('data/media', 'utf8');
        files.forEach(function (dirname) {
            this.loadData(dirname);
        }.bind(this));
    }

    loadData(id) {
        try {
            this.data[id] = JSON.parse(fs.readFileSync('data/media/'+id+'/metadata.json', 'utf8'));
        }
        catch (e) {
            return e;
        }
    }

    saveData(id) {
        try {
            fs.writeFileSync('data/media/'+id+'/metadata.json', JSON.stringify(this.data[id], undefined, 2), 'utf8');
        }
        catch (e) {
            console.log(e.stack);
        }
    }

    addMedia(id, meta) {
        if (!this.data[id])
            this.data[id] = { };

        this.data[id][meta.filename] = {
            name: meta.originalname,
            mimetype: meta.mimetype,
            size: meta.size,
            public: false,
        };

        try {
            fs.accessSync('data/media/'+id, fs.constants.R_OK);
        }
        catch (e) {
            fs.mkdir('data/media/'+id, 0o755);
        }

        fs.renameSync(meta.path, 'data/media/'+id+'/'+meta.filename);
        setTimeout(() => { this.saveData(id); }, 0);
    }

    deleteMedia(id, filename) {
        if (!this.data[id][filename])
            return false;
        fs.unlinkSync('data/media/'+id+'/'+filename);
        delete this.data[id][filename];
        this.saveData(id);
        console.log("BAWLETED", id, '/', filename);
        return true;
    }

    renameMedia(id, filename, name) {
        if (!this.data[id][filename])
            return false;
        this.data[id][filename].name = name;
        this.saveData(id);
        console.log("RENAMED", id, '/', filename, ' to ', name);
        return true;
    }

    quota(id) {
        if (!this.data[id])
            return 0;
        let sum = 0;
        for (let key in this.data[id]) {
            sum += this.data[id][key].size;
        }
        return sum;
    }

    listFiles(id, mimetype) {
        let files = [ ];
        if (!this.data[id])
            return [ ];

        for (let file in this.data[id]) {
            if (!mimetype || this.data[id][file].mimetype.match(mimetype))
                files.push(Object.assign({ path: '/media/'+id+'/'+file, editable: true }, this.data[id][file]));
        }

        let notId = id;
        for (let id in this.data) {
            if (id == notId)
                continue;
            for (let file in this.data[id]) {
                if (this.data[id][file].public && !mimetype || this.data[id][file].mimetype.match(mimetype))
                    files.push(Object.assign({ path: '/media/'+id+'/'+file }, this.data[id][file]));
            }
        }
        return files;
    }

}

let db = new MediaDB();


let router = express.Router();
let upload = multer({ dest: 'data/uploads/' });

router.get('', function (req, res, next) {
    if (!req.user || !req.user.player)
        res.status(400).json({ error: "You must be logged in" });
    else
        res.json({
            quota: req.user.player.isWizard ? Infinity : QUOTA,
            files: db.listFiles(req.user.player.id),
        });
});

router.put('', upload.single('image'), function (req, res, next) {
    if (!req.user || !req.user.player)
        res.status(400).json({ error: "You must be logged in" });
    else {
        let player = req.user.player;

        if (!player.isWizard && db.quota(player.id) > QUOTA)
            res.status(400).json({ error: "File quota exceeded" });
        else {
            db.addMedia(player.id, req.file);
            res.json({ success: true, path: '/media/'+player.id+'/'+req.file.filename });
        }
    }
});

router.delete('', function (req, res, next) {
    if (!req.user || !req.user.player)
        res.status(400).json({ error: "You must be logged in" });
    else if (!req.body.path)
        res.status(400).json({ error: "Invalid request" });
    else {
        let m = req.body.path.match(/^\/media\/(\d+)\/(\w+)$/);
        if (!m || (!req.user.player.isWizard && m[1] != req.user.player.id) || !db.deleteMedia(m[1], m[2]))
            res.status(400).json({ error: "An error occurred while trying to delete the file" });
        else    
            res.json({ success: true });
    }
});

router.post('', function (req, res, next) {
    if (!req.user || !req.user.player)
        res.status(400).json({ error: "You must be logged in" });
    else if (!req.body.path || !req.body.name)
        res.status(400).json({ error: "Invalid request" });
    else {
        let m = req.body.path.match(/^\/media\/(\d+)\/(\w+)$/);
        if (!m || (!req.user.player.isWizard && m[1] != req.user.player.id) || !db.renameMedia(m[1], m[2], req.body.name))
            res.status(400).json({ error: "An error occurred while trying to rename the file" });
        else    
            res.json({ success: true });
    }
});


const allowAccess = function (req, res, next) {
    if (!req.user || !req.user.player)
        res.status(400).send();
    else if (req.path.match(/metadata.json/))
        res.status(404).send();
    else {
        // TODO make sure the item is public??
        next();
    }
};

module.exports = {
    db,
    router,
    allowAccess,
};

