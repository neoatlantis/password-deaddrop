const crypto = require("crypto");
const path = require("path");
const express = require("express");
var nacl = require("tweetnacl");
nacl.util = require("tweetnacl-util");


const randomstr = require("./crypto-random-string.js");
const config = require("./config.js");
const storage = require("./storage.js");


const app = express();

app.use(require("./express.ratelimit.js"));
app.use(express.json());
app.use(express.static(path.join(__dirname, "static")));




app.post("/api/new", async function(req, res){
    const request_json = req.body;
    const { m_s, c_s } = request_json;
    try{
        const ret = await storage.store(m_s, c_s);
        res.type("json");
        return res.status(200).send(ret);
    } catch(e){
        res.status(400).send(e.toString());
    }
});




app.get("/api/stat/:message_id([0-9a-zA-Z]+)", async function(req, res){
    const message_id = req.params.message_id;
    const stat = await storage.stat(message_id);
    res.type('json');
    res.status((stat.error?400:200)).send(stat);
});




// We don't want to put message ID in URL.
app.post("/api/retrieve", async function(req, res){
    const request_json = req.body;
    const { key, message_id } = request_json;
    const result = await storage.retrieve(message_id, key);
    res.type('json');
    res.status(200).send(result);
});





app.listen(7100);
