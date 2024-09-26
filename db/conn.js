const mongoose = require('mongoose');
const DB = process.env.DB;

mongoose.connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Successfully Connected to Database!!"))
.catch((error) => console.error("error", error));
