$(function(){
//////////////////////////////////////////////////////////////////////////////

function bufferToHex(buffer) {
    var s = '', h = '0123456789ABCDEF';
    (new Uint8Array(buffer)).forEach((v) => { s += h[v >> 4] + h[v & 15]; });
    return s;
}
function hexToBuffer(hexString){
    return new Uint8Array(hexString.match(/.{1,2}/g)
        .map(byte => parseInt(byte, 16)));
}

async function fetchExistingPassword(id){
    const keypair = nacl.box.keyPair();
    const publickeyHEX = bufferToHex(keypair.publicKey);
    const nonce = new Uint8Array(nacl.box.nonceLength);

    function decryptBox(box, serverPublicKeyHEX){
        const theirPublicKey = hexToBuffer(serverPublicKeyHEX);
        const mySecretKey = keypair.secretKey;
        const ciphertext = nacl.util.decodeBase64(box);
        const plaintext = nacl.util.encodeUTF8(nacl.box.open(
            ciphertext,
            nonce,
            theirPublicKey, mySecretKey,
        ));
        
        $(plaintext).appendTo("body");
    }


    $.get("/api/get/" + id + "/with/" + publickeyHEX)
    .done(function(data){
        decryptBox(data.data, data.publicKey);
    });

}


function fetchNewPassword(){
    $.get("/api/new")
    .done(function(data){
        const url = 
            window.location.origin + window.location.pathname + 
            "#" + data.id;
        $("<a>", {"href": url}).text(url).appendTo("body");
    });
}


// boot up
if(/^[0-9a-z]{10}$/.test(window.location.hash.slice(1))){
    fetchExistingPassword(window.location.hash.slice(1));
    window.location.hash = "";
} else {
    fetchNewPassword();
}


//////////////////////////////////////////////////////////////////////////////
});
