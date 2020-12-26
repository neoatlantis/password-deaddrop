var nacl = require("tweetnacl");
nacl.util = require("tweetnacl-util");


module.exports.decrypt = function(key, data){
    try{
        data = Buffer.from(data, "base64");
        key = nacl.hash(
            Buffer.from(key, "ascii")).slice(nacl.secretbox.keyLength);
        const nonce = data.slice(0, nacl.secretbox.nonceLength);
        return nacl.secretbox.open(
            data.slice(nacl.secretbox.nonceLength),
            nonce,
            key
        );
    } catch(e){
        return null;
    }
}
