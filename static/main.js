import { derive_challenge_keys, derive_message_keys, encrypt, decrypt, random_secret } from "./crypto.js";





const app = new Vue({
    el: "#app",
    data: {
        display: "default",

        message: "test",
        challenge_question: "test",
        challenge_answer: "test",

        created_url: "url",
        created_secret: "secret",

        retrieve_stat: false,
        retrieve_message_id: "",
        retrieve_secret: "",
        retrieve_challenge_answer: "",
        retrieve_challenge_question: "",
        retrieve_message: "",

        error: "",
    },

    computed: {
        allow_create: function(){
            return (
                this.message.trim() != "" &&
                !(
                    (this.challenge_question.trim() != "") ^
                    /^[0-9a-z]{1,}$/i.test(this.challenge_answer)
                )
            );
        }
    },

    methods: {
        create: on_create_deaddrop,
        retrieve: on_retrieve_message,
    }
    
});


function on_create_deaddrop(){
    const message = this.message.trim();
    const challenge_question = this.challenge_question.trim();
    const challenge_answer = this.challenge_answer.trim().toLowerCase();

    const secret = random_secret(); // the main secret to be revealed

    const { K_CE, K_CP } = derive_challenge_keys(secret);
    const { K_ME, K_MP } = derive_message_keys(secret, challenge_answer);

    const m_c = encrypt(K_ME, message);
    const c_c = encrypt(K_CE, challenge_question);

    console.log("m_c", m_c);
    console.log("c_c", c_c);

    const m_s = encrypt(K_MP, m_c);
    const c_s = encrypt(K_CP, c_c);

    $.ajax({
        "method": "POST",
        "url": "/api/new",
        "contentType": "application/json",
        "data": JSON.stringify({ m_s, c_s }),
    }).done(function(data){
        if(data["message-id"]){
            const message_id = data["message-id"];
            app.created_url = window.location.origin + "/#" + message_id;
            app.created_secret = secret;
            app.display = "created";
        }
    });

}




async function on_retrieve_message(){
    const self = this;
    const message_id = this.retrieve_message_id;

    if(this.retrieve_stat === false){
        const result = await $.ajax({
            "method": "GET",
            "url": "/api/stat/" + message_id,
            "dataType": "json",
        });
        this.retrieve_stat = result["stat"];
    }

    if(!this.retrieve_secret){
        this.display = "retrieve";
        return;
    }

    const { K_CE, K_CP } = derive_challenge_keys(this.retrieve_secret);

    let challenge_question = this.retrieve_challenge_question;
    if("challenge" == this.retrieve_stat && !challenge_question){
        const result = await $.ajax({
            "method": "POST",
            "url": "/api/retrieve",
            "dataType": "json",
            "contentType": "application/json",
            "data": JSON.stringify({
                key: nacl.util.encodeBase64(K_CP),
                message_id: message_id,
            }),
        });
        if(result["data"] !== undefined){ // server returned challenge
            challenge_question = nacl.util.encodeUTF8(
                decrypt(K_CE, result["data"]));
            this.retrieve_stat = "message"; // next
            this.retrieve_challenge_question = challenge_question;
            return;
        } else {
            // error
            this.error = result["error"] || "Unknown error"; 
        }
    }

    if("message" == this.retrieve_stat && !this.retrieve_message){
        const { K_ME, K_MP } = derive_message_keys(
            this.retrieve_secret,
            this.retrieve_challenge_answer.trim().toLowerCase());
        
        const result = await $.ajax({
            "method": "POST",
            "url": "/api/retrieve",
            "dataType": "json",
            "contentType": "application/json",
            "data": JSON.stringify({
                key: nacl.util.encodeBase64(K_MP),
                message_id: message_id,
            }),
        });
        if(result["data"] !== undefined){ // server returned message 
            this.retrieve_message = nacl.util.encodeUTF8(
                decrypt(K_ME, result["data"]));
        } else {
            // error
            this.error = result["error"] || "Unknown error"; 
        }
    }
    
}
if(/^[0-9a-z]{5,20}$/.test(window.location.hash.slice(1))){
    app.retrieve_message_id = window.location.hash.slice(1);
    //window.location.hash = "";
    app.retrieve();
}

/*
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









// boot up
var clipboard = new ClipboardJS("#copy-newurl");
*/



//////////////////////////////////////////////////////////////////////////////
