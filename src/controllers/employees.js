import mongoose from 'mongoose';
import {Router} from 'express';
import path from 'path';
import fs from 'fs';
import Busboy from 'busboy';
import csv from 'csvtojson';
import Employees from '../models/employees/employees';

const readChunk = require('read-chunk');
const fileType = require('file-type');

export default ({config, db}) => {

    let api = Router();

    // 'V1/employees/import'
    api.post('/import', ( req, res ) => {

        let saveTo = "";
        let fileName = "";

        /*
        Reading post headers using busboy
        */
        let busboy = new Busboy({ headers: req.headers });                       
        busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {

            fileName = filename;
            
            saveTo = path.join(path.dirname(require.main.filename)+"/../assets/files/", fileName);
            file.pipe(fs.createWriteStream(saveTo));
        });
        busboy.on('finish', function() {
                        
            /*
                validating file format if someone tries to hack the file type :)
            */ 

            const buffer = readChunk.sync(saveTo, 0, fileType.minimumBytes);      
              
            let fileInfoObj = fileType(buffer);    

            console.log(fileInfoObj);

            /*
                This condition seems wiered but it works 99%
                as unfortunately fileInfoObj has value null if the file is csv because
                fileType from buffer detects any file type except csv :)
            */

            if ( fileInfoObj === null ) {

                //console.log("reading csv file");
                csv().fromFile(saveTo)
                .then((jsonArrayObj)=>{

                    res.status(200).json({
                                            message:"File has been uploaded successfully",                                   
                                            total_records:jsonArrayObj.length,
                                            records_imported:1,
                                            file_name:fileName
                    });

                    /*
                        Recursively invoking a function to import file records
                        in batches
                    */
                    function recursive(counter,batchSet, jsonArrayObj ) {

                        let records = [];
                        let batchSize = counter+batchSet;
                        for (let k = counter; k < batchSize; k++ ) {

                            let employeeObj = new Employees();
                            if ( typeof jsonArrayObj[k] == 'undefined' ) {

                                break;
                            }
                            employeeObj.name = jsonArrayObj[k].name;
                            employeeObj.age = jsonArrayObj[k].age;
                            employeeObj.address = jsonArrayObj[k].address;
                            employeeObj.team = jsonArrayObj[k].team;
                            employeeObj.search_field = jsonArrayObj[k].name+" "+jsonArrayObj[k].age+" "+jsonArrayObj[k].address+" "+jsonArrayObj[k].team;
                            records.push(employeeObj);                    
                                                    
                        }

                        Employees.collection.insert(records,function(err,insertedRecords){

                            if ( err ) {
                                
                               
                                res.status(500).send({
                                                        error_message:"Import error at record ",
                                                        record_item:err, 
                                                        total_records:csvRecordsArray.length,
                                                        records_imported:index+1,
                                                        file_name:fileName                                                    
                                });

                            }else {
                                                                        
                                /*
                                If the batchSize is still less than the records going to be imported
                                keep sending realtime progress of imports using socket to the client and import the
                                next batch
                                */
                               //console.log(insertedRecords);
                                if ( batchSize < jsonArrayObj.length ) {                                    

                                    res.io.emit("liveProgressStation",{
                                                                            message:"Importing records ...",                                                                       
                                                                            total_records:jsonArrayObj.length,
                                                                            records_imported:batchSize,
                                                                            file_name:fileName
                                    });

                                    recursive(batchSize, batchSet, jsonArrayObj );

                                }else {

                                    /*
                                        Delete the file as all records being imported and
                                        update the front end with in real time.
                                    */
                                    fs.unlinkSync(saveTo);
                                    res.io.emit("liveProgressStation",{
                                                                        message:"File has been imported successfully",
                                                                        records_imported:jsonArrayObj.length
                                    });
                                }
                                
                            }

                        });
                    }

                    /*
                        setting the batch size depending on the number of records
                        in csv file recieved
                    */

                    //console.log("have reached to condition", jsonArrayObj.length);
                    if ( jsonArrayObj.length < 10000 ) {

                        recursive(0, 1000, jsonArrayObj );
                        
                    }else {

                        recursive(0, 10000, jsonArrayObj );
                    }

                }).catch(error=>{

                    fs.unlinkSync(saveTo)
                    res.status(500).send({error_message:"Invalid file format",file_name:fileName});
                });  
            }else {
                    fs.unlinkSync(saveTo);
                    res.status(500).send({error_message:"Invalid file format",file_name:fileName});
            }
             
            
        });
                
        return req.pipe(busboy);
            

    });

    // 'V1/employees/search'
    api.post('/search', ( req, res ) => {

       
        let searchString = req.body.query;
        let query = Employees.find({ name:{$regex:'.*'+searchString+'.*', $options:'i'} }, 'name age address team').limit(20); 
        query.exec(function (err, docs) { 

            if (err) {

                res.status(500).send({error_message:err});

            }else {

                if ( docs.length > 0 ) {

                    res.status(200).json({
                        results:docs
                    });

                }else {

                    res.status(200).json({
                        results:[]
                    });
                }
            }
        });
        
       

    });

    return api;
}