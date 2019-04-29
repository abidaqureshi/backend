import mongoose from 'mongoose';
let Schema = mongoose.Schema;

let employeesSchema = new Schema ({

    name: String,
    age: Number,
    address:String,
    team: String,
    search_field: String // full text search field if we want to expand the search criteria

});

module.exports = mongoose.model('Employees',employeesSchema);