// Import necessary libraries
import fs from 'fs';                  // For reading the private key from file
import openpgp from 'openpgp';        // For PGP-based encryption and decryption
import fetch from 'node-fetch';       // For making HTTP requests
import https from 'https';            // For creating an HTTPS agent that can bypass SSL verification
import { v4 as uuidv4 } from 'uuid';  // For generating a random UUID, used as a token

// Configuration settings: Customize these according to your Passbolt setup
const config = {
    serverUrl: 'SERVER_URL',            // Replace with your Passbolt server URL, e.g., 'https://your-server.local'
    URL_LOGIN: '/auth/jwt/login.json',  // Path for the JWT login endpoint
    privateKeyPath: 'private.key',      // Path to the user's private GPG key file
    userId: 'USER_ID'                   // The user ID, can be found in MySQL or the Passbolt UI
};

// Create an HTTPS agent to bypass self-signed certificate validation
// This is useful if your Passbolt server uses self-signed certificates in development.
const httpsAgent = new https.Agent({
    rejectUnauthorized: false // This disables SSL certificate validation (not secure, use only in development!)
});

// Helper function to fetch the server's public key, which is needed to encrypt the challenge
async function fetchServerPublicKey() {
    try {
        // Make a GET request to the server's `/auth/verify.json` endpoint to retrieve the public key
        const response = await fetch(`${config.serverUrl}/auth/verify.json`, { agent: httpsAgent });
        const data = await response.json();
        console.log("Fetched server public key."); // Log success
        return data.body.keydata;  // Return the public key data for encryption
    } catch (error) {
        // Handle errors that occur when fetching the public key
        console.error(`Failed to fetch server public key: ${error.message}`);
        throw new Error('Could not retrieve the server public key.');
    }
}

// Helper function to encrypt the challenge message using the server's public key and user's private key
async function encryptMessage(message, passphrase) {
    try {
        // Fetch the server's public key for encrypting the message
        const armoredServerPublicKey = await fetchServerPublicKey();
        const serverPublicKey = await openpgp.readKey({ armoredKey: armoredServerPublicKey });
        console.log('Server public key successfully fetched.');

        // Read the user's private key from the file system
        const armoredPrivateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
        const privateKey = await openpgp.readPrivateKey({ armoredKey: armoredPrivateKey });
        console.log('Private key successfully read.');

        // Decrypt the private key using the user's passphrase
        const decryptedPrivateKey = await openpgp.decryptKey({
            privateKey: privateKey,
            passphrase: passphrase
        });
        console.log('Private key successfully decrypted.');

        // Encrypt the message with the server's public key and sign it with the user's private key
        const encryptedMessage = await openpgp.encrypt({
            message: await openpgp.createMessage({ text: message }),  // Create the message
            encryptionKeys: serverPublicKey,                          // Encrypt with server's public key
            signingKeys: decryptedPrivateKey                          // Sign with user's private key
        });
        console.log('Message successfully encrypted.');

        return encryptedMessage;  // Return the encrypted message to be sent to the server
    } catch (error) {
        // Handle encryption errors
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt the message.');
    }
}

// Function to create a login challenge, which is a JSON object containing a random UUID token and an expiry timestamp
function createLoginChallenge() {
    return JSON.stringify({
        version: "1.0.0",                               // API version (static value)
        domain: config.serverUrl,                       // The domain of your Passbolt server
        verify_token: uuidv4(),                         // Randomly generated token (UUID)
        verify_token_expiry: Math.floor(Date.now() / 1000) + 600  // Token expires in 10 minutes (600 seconds)
    });
}

// Function to handle the login process by sending the encrypted challenge to the server's JWT login endpoint
async function login(passphrase) {
    try {
        console.log('Performing JWT login...');

        // Create the login challenge that will be encrypted and sent to the server
        const challenge = createLoginChallenge();

        // Encrypt the challenge using the server's public key and user's private key
        const encryptedChallenge = await encryptMessage(challenge, passphrase);
        console.log(`Encrypted challenge: ${encryptedChallenge}`);

        // Make a POST request to the JWT login endpoint with the encrypted challenge
        const response = await fetch(`${config.serverUrl}${config.URL_LOGIN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // Indicate that we're sending JSON
            },
            body: JSON.stringify({
                user_id: config.userId,             // Pass the user's ID
                challenge: encryptedChallenge       // Include the encrypted challenge
            }),
            agent: httpsAgent // Use the custom https agent that allows self-signed certificates
        });

        // Parse the server's response
        const result = await response.json();
        console.log(`Login response status: ${response.status}`);
        console.log(`Login response body: ${JSON.stringify(result)}`);

        // Check if the login was successful
        if (response.status === 200) {
            console.log('JWT login successful.');
            return result;  // Return the result if successful
        } else {
            throw new Error(`Login failed: ${result.message}`);  // Throw an error if login failed
        }
    } catch (error) {
        // Handle errors during the login process
        console.error(`Error during login: ${error.message}`);
        throw error;
    }
}

// Main function to initiate the authentication process
async function performJwtAuth() {
    // Replace this with the passphrase for the user's private key
    const passphrase = 'PRIVATE_KEY_PASSPHRASE';

    try {
        // Perform the login process
        await login(passphrase);
        console.log('Authentication process complete.');
    } catch (error) {
        // Handle authentication errors
        console.error('Failed to authenticate:', error);
    }
}

// Start the JWT authentication process
performJwtAuth();