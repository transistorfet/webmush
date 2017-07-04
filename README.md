
## WebMUSH

This is a web-based MUSH (Multi-User Shared Hallucination) server written in node.js using express, websockets, and mithril.

#### Configuration

The following environment variables are recognized:

* PORT      The port number the server should run on.  Default: 3000

* DATA_DIR  The directory where data is stored (the object db and uploaded media).  It should match the layout of the data
            directory in the repository.  Default: <repo>/data

#### Running

The npm dependencies must be installed first using
```npm install```

The client code must be compiled with webpack.  This can be done manually using
```npm run build```

Or nodemon can be used to recompile the client code and restart the server whenever a code change is made using
```npm install -g nodemon```
```npm run nodemon```
 
The server can be started manually without automatic restarting using
```npm start```

