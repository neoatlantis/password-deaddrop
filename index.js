const crypto = require("crypto");
const path = require("path");
const express = require("express");
var nacl = require("tweetnacl");
nacl.util = require("tweetnacl-util");

const svgcaptcha = require("svg-captcha");
svgcaptcha.loadFont("font.ttf");
svgcaptcha.options.width = 700;
svgcaptcha.options.height = 80;

const randomstr = require("./crypto-random-string.js");
const config = require("./config.js");


const app = express();
var passwords = {};
var ratelimit = config.ratelimit;



async function newRandomPassword(){
    const passwordID = await randomstr.small(10);
    const passwordValue = await randomstr.big(15);

    passwords[passwordID] = {
        password: passwordValue,
        expires: Date.now() + config["password-life"],
    };
    return {id: passwordID, password: passwordValue};
}


app.get("/api/new", async function(req, res){
    ratelimit -= 1;
    if(ratelimit <= 0){
        return res
            .status(503)
            .send("Service temporary unavailable. Please wait a while.");
    }

    const pair = await newRandomPassword();
    res.type("json");
    res.status(200).send(pair);
});


app.get("/api/get/:passwordID([0-9a-zA-Z]{10})/with/:clientKey([0-9a-fA-F]{64})", async function(req, res){
    // fetch the password
    const passwordID = req.params.passwordID.toLowerCase();
    if(passwords[passwordID] === undefined){
        return res.status(404).send("Not found.");
    }
    const password = passwords[passwordID].password;
    delete passwords[passwordID];

    // generates key for answer
    const clientPublicKey = Buffer.from(req.params.clientKey, "hex");
    const serverKeyPair = nacl.box.keyPair();
    // -- we never reuses a key pair, no worry
    const nonce = new Uint8Array(nacl.box.nonceLength);

    // generates image
    const captchaBuffer = nacl.util.decodeUTF8(svgcaptcha(password, {
        color: false,
        noise: 3
    }));

    // encrypts image
    const ciphertextBase64 = new Buffer(nacl.box(
        captchaBuffer, nonce,
        clientPublicKey,
        serverKeyPair.secretKey
    )).toString("base64");
    const serverPublicKeyHEX = 
        new Buffer(serverKeyPair.publicKey).toString("hex");

    res.type('json');
    res.status(200).send({
        "publicKey": serverPublicKeyHEX,
        "data": ciphertextBase64,
    });
});

app.use(express.static(path.join(__dirname, "static")));


/* Clear expired password every 30 seconds. */
setInterval(function(){
    const now = Date.now();
    var dellist = [];
    for(var k in passwords){
        if(passwords[k].expires < now){
            dellist.push(k);
        }
    }
    if(dellist.length > 0){
        console.debug("Delete " + dellist.length + " passwords.");
    }
    dellist.forEach(function(k){ delete passwords[k]; });
}, 30000);

/* Reset rate limit */
setInterval(function(){
    ratelimit = config.ratelimit;
}, 10000);


app.listen(7100);
