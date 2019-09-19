'use strict';

/*
A modified version from

https://github.com/sindresorhus/crypto-random-string

Stripped for our use. Only a given subset of chars is used. And use await
for async call on randomBytes.
*/



const crypto = require('crypto');

const alphabet32 = 'abcdefghjkmnopqrstuvwxyz23456789'.split('');
const alphabet56 = 'abcdefghjkmnopqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');

const generateForCustomCharacters = async (length, characters) => {
    // Generating entropy is faster than complex math operations, so we use the simplest way
    const characterCount = characters.length;
    const maxValidSelector = (Math.floor(0x10000 / characterCount) * characterCount) - 1; // Using values above this will ruin distribution when using modular division
    const entropyLength = 2 * Math.ceil(1.1 * length); // Generating a bit more than required so chances we need more than one pass will be really low
    let string = '';
    let stringLength = 0;

    while (stringLength < length) { // In case we had many bad values, which may happen for character sets of size above 0x8000 but close to it
        const entropy = await crypto.randomBytes(entropyLength);
        let entropyPosition = 0;

        while (entropyPosition < entropyLength && stringLength < length) {
            const entropyValue = entropy.readUInt16LE(entropyPosition);
            entropyPosition += 2;
            if (entropyValue > maxValidSelector) { // Skip values which will ruin distribution when using modular division
                continue;
            }

            string += characters[entropyValue % characterCount];
            stringLength++;
        }
    }

    return string;
};

module.exports.small = async function(length){
    return await generateForCustomCharacters(length, alphabet32);
};

module.exports.big = async function(length){
    return await generateForCustomCharacters(length, alphabet56);
};
