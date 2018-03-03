/**
 * This file contains helper methods for aes ctr support throughout the  application
 *
 * @see http://web.cs.ucdavis.edu/~rogaway/papers/modes.pdf
 */

require('dotenv').config();

// NodeJs encryption with AES CTR
const crypto  = require('crypto');
const envalid = require('envalid');

// Ensuring that AES KEY is set in the .env file
const env = envalid.cleanEnv(process.env, {
    AES_KEY : envalid.str(),
    AES_IV  : envalid.str()
});

const algorithm = 'aes-256-ctr';
const password  = process.env.AES_KEY;
const iv        = process.env.AES_IV;

//
// Re-using the iv for CTR will break its security.
// Ideally, we must store the iv in the DB in encrypted form
// along with the encrypted tokens, and during decryption,
// decrypt the iv, and then decrypt the tokens.
// After this, we must re-compute a random 16 byte iv,
// use it re-compute the encrypted form of the tokens,
// then encrypt the new iv and update the user.tokens parameter.
//

/**
 * Encrypts the plaintext using the algorithm and password
 */
const encrypt = (plaintext) => {

    const cipher = crypto.createCipheriv(algorithm, password, iv);

    var crypted = cipher.update(plaintext, 'utf8', 'hex');

    crypted += cipher.final('hex');

    return crypted;
};

/**
 * Decrypts the ciphertext using the algorithm and password
 */
const decrypt = (ciphertext) => {

    const decipher = crypto.createDecipheriv(algorithm, password, iv);

    var decrypted = decipher.update(ciphertext, 'hex', 'utf8');

    decrypted += decipher.final('utf8');

    return decrypted;
};

module.exports = {
    encrypt,
    decrypt
};
