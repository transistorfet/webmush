
'use strict';

const m = require('mithril');


const FileInfo = {
    quota: 0,
    files: [ ],
    error: '',

    load: function (done, reload) {
        if (!reload && FileInfo.files.length > 0)
            return;

        m.request({
            method: 'GET',
            url: '/uploads',
        }).then(function (response) {
            this.quota = response.quota;
            this.files = response.files;
            console.log(response, typeof this.quota);
            if (done)
                done();
        }.bind(this)).catch(function (response) {
            console.log(response);
            this.error = response.error;
        }.bind(this));
    },

    delete: function (path) {
        m.request({
            method: 'DELETE',
            url: '/uploads',
            data: { path: path },
        }).then(function (response) {
            this.files = this.files.filter((item) => { return item.path != path });
        }.bind(this)).catch(function (response) {
            console.log(response);
            this.error = response.error;
        }.bind(this));
    },

    upload: function (file, done) {
        let form_data = new FormData();
        form_data.append('image', file, file.name);

        m.request({
            method: "PUT",
            url: '/uploads',
            data: form_data,
        }).then(function (response) {
            if (done)
                done(response.path);
        }).catch(function (response) {
            console.log(response);
            this.error = response.error;
        }.bind(this));
    },

    rename: function (path, name) {
        console.log("RENAME", path, name);
        m.request({
            method: 'POST',
            url: '/uploads',
            data: { path: path, name: name },
        }).then(function (response) {
            let file = this.files.find((item) => { return item.path == path });
            if (file)
                file.name = name;
        }.bind(this)).catch(function (response) {
            console.log(response);
            this.error = response.error;
        }.bind(this));
    },
};

module.exports = FileInfo;
 
