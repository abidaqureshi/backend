import mongoose from 'mongoose';
import config from './config'

export default callback=>{

    let db = mongoose.connect(config.mongoUrl,{useNewUrlParser:true})
        .then(()=>{console.log("mongodb connected")})
        .catch(err => console.log(err));
    callback(db);
}
