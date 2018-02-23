const express = require('express')
const app = express()
const fileUpload = require('express-fileupload');
const conv = require('binstring');
const header = 44;

app.use(fileUpload());
app.set("view engine", "pug")

app.get("/", (req, res) => {
    res.render("homepage", {title: "bite"});
});


app.post('/hideText', function (req, res) {
        // if(!req.files || !req.body.message){
        //     return res.send(400);
        // }
    
    let sound = req.files.wav;
    let message = "test";
    let messageBuffer = conv(message, { in:'binary' });
    let messageBinary = "";
    for(let i = 0; i < messageBuffer.length; i++){
        messageBinary += messageBuffer[i].toString(2);
    }
    console.log(messageBinary);
    if(messageBinary.length > sound.data - 45){
        return res.send({error: 'Text is too long or sound is too short'})
    }else{
        for(let i = 0, len = messageBinary.length; i < len; i++){
            strBin = sound.data[header+i].toString(2);
            strBin[7] = messageBinary[i]
            sound.data[header+i] = strBin.toString(10);
        }
        res.send(200);
    }

});


app.listen(3000, () => console.log('Chiffrement App listening on port 3000'))