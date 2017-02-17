
'use strict';

let express = require('express');
let logger = require('morgan');

let app = express();
app.use(logger('dev'));

app.use('/static', express.static('static'));

app.get('/', function (req, res) {
  res.send('Hello World!');
})

app.listen(3000, function () {
  console.log('app is listening on port 3000!');
})
 
