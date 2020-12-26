const alphabet32 = 'abcdefghjkmnopqrstuvwxyz23456789'.split('');
const alphabet56 = 'abcdefghjkmnopqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');

function generateForCustomCharacters (length, characters){
    // Generating entropy is faster than complex math operations, so we use the simplest way
    const characterCount = characters.length;
    const maxValidSelector = (Math.floor(0x10000 / characterCount) * characterCount) - 1; // Using values above this will ruin distribution when using modular division
    const entropyLength = 2 * Math.ceil(1.1 * length); // Generating a bit more than required so chances we need more than one pass will be really low
    let string = '';
    let stringLength = 0;

    while (stringLength < length) { // In case we had many bad values, which may happen for character sets of size above 0x8000 but close to it
        const entropy = new Uint16Array(nacl.randomBytes(entropyLength*2).buffer);
        let entropyPosition = 0;

        while (entropyPosition < entropyLength && stringLength < length) {
            const entropyValue = entropy[entropyPosition];
            entropyPosition += 1;
            if (entropyValue > maxValidSelector) { // Skip values which will ruin distribution when using modular division
                continue;
            }

            string += characters[entropyValue % characterCount];
            stringLength++;
        }
    }

    return string;
};

function random_secret(){
    return generateForCustomCharacters(20, alphabet56);
}


function encrypt(key, data){
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    key = nacl.hash(key).slice(nacl.secretbox.keyLength);

    const ciphertext = nacl.secretbox(
        nacl.util.decodeUTF8(data),
        nonce,
        key
    );

    const result = new Uint8Array(ciphertext.length + nonce.length);
    result.set(nonce, 0);
    result.set(ciphertext, nonce.length);

    return nacl.util.encodeBase64(result);
}


function decrypt(key, data){
    try{
        data = nacl.util.decodeBase64(data);
        key = nacl.hash(key).slice(nacl.secretbox.keyLength);
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


function derive_challenge_keys(secret){
    const K_CE = nacl.hash(nacl.util.decodeUTF8(secret + "challenge encryption"));
    const K_CP = nacl.hash(K_CE);
    return { K_CE, K_CP };
}

function derive_message_keys(secret, challenge_answer){
    const K_ME = nacl.hash(nacl.util.decodeUTF8(secret + "message encryption" + challenge_answer));
    const K_MP = nacl.hash(K_ME);
    return { K_ME, K_MP }
}



export { derive_challenge_keys, derive_message_keys, encrypt, decrypt, random_secret };
