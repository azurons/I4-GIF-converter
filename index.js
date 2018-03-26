const express = require('express');
const app = express();
const uuidv1 = require('uuid/v1');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const conv = require('binstring');
const header = 44;

app.use(fileUpload());
app.set("view engine", "pug")

app.get("/", (req, res) => {
    res.render("homepage", {title: "test"});
});


app.post('/hideText', function (req, res) {
   /* if(!req.files || !req.body.message){
        return res.send({error: "Please provite a valid music and message"});
    }*/

    let sound = req.files.wav;
    //let message = res.body.message;
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
            let strBin = sound.data[header+i].toString(2);
            strBin[strBin.length - 1] = messageBinary[i]
            sound.data[header+i] = strBin.toString(10);
        }

        let temporalName = uuidv1();
        fs.writeFile('./musics/' + temporalName, sound.data, (err)=>{
            if(err){
                res.send({error: "Server encounted an error"});
            }else{
                console.log(process.cwd());
                res.download(process.cwd() + '/musics/' + temporalName, sound.name , function(err){
                    if(err){
                        console.log('Error : ' + err);
                    }else{
                        fs.unlink('./musics/' + temporalName);
                    }
                });
            }
        })
    }   

});


app.post('/revealText', function (req,res){
    if(!req.files){
        return res.send({error: "Please provite a valid music and message"});
    }

    let sound = req.files.wav;
    let binary = "";
    
    for(let i = header + 1, len = sound.data.length; i < len; i++){
        //console.log(sound.data[i].toString(2));
        let strBin = sound.data[i].toString(2);
        binary += strBin[strBin.length - 1];
    }

    let message = "";
    for(let i = 0, len = binary.length; i < len; i+=8){
        let bin = binary.slice(i, i+8);
        let int = parseInt(bin, 2);
        message += String.fromCharCode(int);
    }

    res.send({message: message})



});

app.listen(3000, () => console.log('Chiffrement App listening on port 3000'))