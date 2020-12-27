/*
memcached-backed storage for deaddrops.

To store a value,
    1. the message M_S,
    2. a challenge C_S (optional)
are required.

To retrieve a value, a key is required as input:
    1. when challenge is present, this is taken as K_CP.
    2. otherwise, this is taken as K_MP.
*/

const config = require("./config.js");
const Memcached = require("memcached");
const L = require("lodash");
const randomstr = require("./crypto-random-string.js");
const { decrypt } = require("./crypt.js");

const memcached = new Memcached(config["memcached"]);


module.exports.store = async function(message_server, challenge_server){

    if(!L.isString(message_server)){
        return { "error": "message-invalid" };
    }
    
    if(challenge_server !== undefined && !L.isString(challenge_server)){
        return { "error": "challenge-invalid" };
        if(challenge_server.length > config["limit-length"]){
            return { "error": "challenge-too-long" };
        }
    }

    if(message_server.length > config["limit-length"] / 3){
        return { "error": "message-too-long" };
    }

    const message_id = await randomstr.small(10);

    return new Promise(function(resolve, reject){
        memcached.set(message_id, {
            m_s: message_server,
            c_s: challenge_server,
            t: new Date().getTime() + config["message-life-long"] * 1000,
        }, config["message-life-long"], function(err, data){
            if(err) return reject({ "error": err });
            resolve({ "message-id": message_id });
        });
    });
    
}



/*
Attempt to retrieve a message.

Message is tried to read from memcached. If challenge is present,
decryption_key is used on it for attempted decryption. Otherwise, it's regarded
for actual message.

If a challenge is decrypted, it's released to the user, and removed from
cached message. The message will have a shorter lifetime. The user may request
the message once more for the actual message. Otherwise, any failed decryption
will lead to the message be deleted.
*/
module.exports.retrieve = async function(message_id, decryption_key){
    
    if(!(L.isString(message_id) && L.isString(decryption_key))){
        return { "error": "invalid-input "}; 
    }

    try{
        decryption_key = Buffer.from(decryption_key, "base64");
    } catch(e){
        return { "error": "invalid-input "}; 
    }

    var message;
    try{
        message = await new Promise(function(resolve, reject){
            memcached.get(message_id, function(err, data){
                if(err) return reject(err);
                resolve(data);
            });
        });
    } catch(e){
        return { "error": "non-exist" };
    }

    var decryption = null, target_name = null, expire=null;

    try{
        if(!L.isFinite(message.t)) throw Error("non-exist");
        if(new Date().getTime() > message.t){
            throw Error("message-expired");
        }

        if(message.c_s != null){
            decryption = decrypt(decryption_key, message.c_s);
            target_name = "challenge";
        } else {
            decryption = decrypt(decryption_key, message.m_s);
            target_name = "message";
        }
        expire = message.t;

        if(!decryption){
            throw Error("decryption-failed");
        }
        
        if(target_name == "challenge"){
            // modify the message lifetime
            expire = new Date().getTime() + config["message-life-short"] * 1000;
            await new Promise(function(resolve, reject){
                memcached.replace(message_id, {
                    m_s: message.m_s,
                    t: expire,
                }, config["message-life-short"], function(err, data){
                    if(err) return reject(err);
                    resolve(data);
                })
            });
        }

    } catch(e){ // any error results in the message being deleted.
        console.error(e);
        memcached.del(message_id, function(err){
            console.log(message_id, "deleted");
        });
        return { "error": e.toString() };
    }

    if(target_name != "challenge"){
        memcached.del(message_id, function(err){});
    }

    return {
        "type": target_name, 
        "data": Buffer.from(decryption).toString("utf-8"),
        "expire": expire
    };

}



/*
View the status of a message
*/
module.exports.stat = async function(message_id){
    if(!L.isString(message_id)){
        return { "error": "invalid-input "}; 
    }

    try{
        let message = await new Promise(function(resolve, reject){
            memcached.get(message_id, function(err, data){
                if(err) return reject(err);
                resolve(data);
            });
        });

        return {
            "stat": (message.c_s != null ? "challenge" : "message"),
            "expire": message.t,
        }
    } catch(e){
        return { "error": "non-exist" };
    }
}
