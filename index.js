const express = require('express');
const app = express();
const uuidv1 = require('uuid/v1');
const fs = require('fs');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const header = 44;
const splitChar = ';';
const splitFileName = '010100110101010001000001010100100101010000111011'; // Binaire du mode "START;"
const splitBin = '01000101010011100100010000111011'; // Binaire du mot "END;"

app.use(fileUpload());
app.use(cors());
app.set("view engine", "pug");

//Lorsqu'on tape sur localhost:3000/ on renvoit la page d'accueil
app.get("/", (req, res) => {
    res.render("homepage");
});

//Fonction pour cacher le text dans l'image
app.post('/hideText', function (req, res) {
    if(!req.files || !req.files.wav || !req.body.message){//au cas où le formulaire soit incomplet
        return res.send({error: "Please provite a valid music and message"});
    }

    let sound = req.files.wav;
    let message = req.body.message + splitChar;
    let messageBinary = '';
    for(let i = 0 ; i < message.length; i++){//on convertit le message en binaire avec un padding de 0
        let rawBinary = message[i].charCodeAt(0).toString(2);
        messageBinary += rawBinary.padStart(8, '0');
    }
    if(messageBinary.length > sound.data - 45){//On check si le message n'est pas trop long
        return res.send({error: 'Text is too long or sound is too short'})
    }else{
        encodeByteInWav(sound, messageBinary, res);
    }   

});


app.post('/revealText', function (req,res){
    if(!req.files || !req.files.wav){
        return res.send({error: "Please provite a valid music and message"});
    }

    let sound = req.files.wav;
    let binary = decodeByteInWav(sound);
    let message = '';
    for(let i = 0, len = binary.length; i < len; i+=8){//On récupère par 8 les bit de poid faible.
        let bin = binary.slice(i, i+8);
        let int = parseInt(bin, 2);
        let char = String.fromCharCode(int);
        if(char == splitChar){//si le bit correspond a ; alors on arrête. C'est notre 
            break;
        }else{
            message += String.fromCharCode(int);//sinon on ajoute la lettre
        }
    }
    res.send({message: message})
});

app.post('/hideImage' , function (req, res){
    if(!req.files || !req.files.wav || !req.files.image){
        return res.send({error: "Please provite a valid music and message"});
    }
    
    let sound = req.files.wav;
    let image = req.files.image;

    let imageBinary = '';
    for(let i = 0; i < image.data.length; i++){
        let rawBinary = image.data[i].toString(2);
        imageBinary += rawBinary.padStart(8, '0');
    }

    imageBinary += splitFileName;
    
    for(let i = 0; i < image.name.length; i++){//On convertit le nom de l'image en binaire pour le garder pour la restitution du fichier
        let rawBinary = image.name[i].charCodeAt(0).toString(2);
        imageBinary += rawBinary.padStart(8, '0');
    }

    imageBinary += splitBin;//on ajoute les delimiteurs


    if(imageBinary.len > sound.data - 45){
        return res.send({error: 'Image is too big or sound is too short'});        
    }else{
        encodeByteInWav(sound, imageBinary, res);
    }
});

app.post('/revealImage', function (req, res){
    if(!req.files || !req.files.wav){
        return res.send({error: 'Please provite a valid music and message'});
    }

    let sound = req.files.wav;
    let binary = decodeByteInWav(sound);
    let sliceIndex = binary.indexOf(splitFileName);
    if(sliceIndex == -1){
        res.send({error: 'No picture found in this music'});
    }else{
        let binImage = binary.slice(0, sliceIndex);
        let temporalName = uuidv1();
        let bufferArray = [];
        for(let i = 0, len = binImage.length; i < len; i+=8){
            let dec = parseInt(binImage.slice(i, i+8), 2);
            bufferArray.push(dec);
        }

        let name = temporalName;
        let nameIndex = binary.indexOf(splitBin);
        if(nameIndex != -1){
            name = '';
            let rawBinary = binary.slice((sliceIndex + splitFileName.length), nameIndex);
            for(let i = 0, len = rawBinary.length; i < len; i+=8){
                let bin = rawBinary.slice(i, i+8);
                let int = parseInt(bin, 2);
                let char = String.fromCharCode(int);
                name += char;
            }
        }

        let data = Buffer.from(bufferArray);

        fs.writeFile('./musics/' +  temporalName,data, (err) => {
            if(err){
                return res.send({error: 'Server encounted an error'});
            }else{
                return res.download(process.cwd() + '/musics/' + temporalName, name,function(err){
                    if(err){
                        console.log('Error : ' + err);
                    }else{
                        fs.unlink('./musics/' + temporalName, (err) => {
                            if(err) console.log('Error :' + err);
                        });
                    }
                });
            }
        });
    }
});

function encodeByteInWav(sound, bin, res){
    for(let i = 0, len = bin.length; i < len; i++){
            let strBin = sound.data[header + i].toString(2);
            let tab = strBin.split('');
            tab[tab.length-1] =  bin[i];
            let newBin = tab.join('');
            sound.data[header + i] = newBin.toString(10);
        }

        let temporalName = uuidv1();
        fs.writeFile('./musics/' + temporalName, sound.data, (err)=>{
            if(err){
                return res.send({error: 'Server encounted an error'});
            }else{
                return res.download(process.cwd() + '/musics/' + temporalName, sound.name , function(err){
                    if(err){
                        console.log('Error : ' + err);
                    }else{
                        fs.unlink('./musics/' + temporalName, (err) => {
                            if(err) console.log('Error :' + err);
                        });
                    }
                });
            }
        })
}

function decodeByteInWav(sound){
    let binary = '';
    for(let i = header, len = sound.data.length; i < len; i++){
        let strBin = sound.data[i].toString(2);
        let tab = strBin.split('');
        binary += tab[tab.length - 1];
    }
    return binary;
}

app.listen(3000, () => {
    console.log('Chiffrement App listening on port 3000');
    if (!String.prototype.padStart) {
        String.prototype.padStart = function padStart(targetLength,padString) {
            targetLength = targetLength>>0; //truncate if number or convert non-number to 0;
            padString = String((typeof padString !== 'undefined' ? padString : ' '));
            if (this.length > targetLength) {
                return String(this);
            }
            else {
                targetLength = targetLength-this.length;
                if (targetLength > padString.length) {
                    padString += padString.repeat(targetLength/padString.length); //append to original to ensure we are longer than needed
                }
                return padString.slice(0,targetLength) + String(this);
            }
        };
    }
});