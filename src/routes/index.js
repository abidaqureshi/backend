import express from 'express';
import config from '../config';
import middleware from '../middleware';
import initializeDb from '../db';
import employees from '../controllers/employees';

let router = express();

//connect to db
initializeDb(db=>{

    // internal middleware
    router.use(middleware({config, db}));    

    //api version v1 (/v1)

    router.use('/employees',employees({config,db}));
});

export default router;