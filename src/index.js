import http from 'http';
import express from 'express';
import bodyParses from 'body-parser';
import cors from 'cors';
import config from './config';
import routes from './routes';

/*
Core server file running express in conjunction with Socket.io server
api
*/


let app = express();
app.server = http.createServer(app);

const io = require('socket.io')(app.server);

/*
You have to change the origin here if the request is coming
from the different server
*/

app.use(cors({
                origin:`http://localhost:3000`,
                credentials:false
}));

/*
    Applying a middlware to associate the socket.io object
    to express response object in order send realtime updates
    to the front end.
*/

app.use(function(req, res, next){
    res.io = io;

    next();
});

//middleware
//parse application/json

app.use(bodyParses.json({
    limit:config.limit
}));

//Applying api version v1 to the express routes
app.use('/v1',routes);

app.server.listen ( config.port );
console.log( `Started on port ${app.server.address().port}`);
export default app;