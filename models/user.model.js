
const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    
    Password : {type:String, required:true},
    Email: {type:String, required:true, unique:true}

}, {

    versionKey:false
    
})

const UserModel = mongoose.model('user', userSchema);

module.exports = {UserModel}