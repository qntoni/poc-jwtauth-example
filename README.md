```
👩  This project is not associated officially with Passbolt
⚗️   It is used to illustrate an article or as a conversation starter.
🧪  Use at your own risks!
```

## Prerequisites

- **Node.js** (Version 14 or higher is recommended)
- **npm** (Node Package Manager)
- A working **Passbolt** instance (self-hosted)
- The private GPG key of the user
- MySQL access to retrieve the `userId` or access to the Passbolt user interface

## Setup

### 1. Install Dependencies

Run the following command to install the necessary dependencies:

```bash
npm install
```

### 2. Configuration

You need to configure the following values inside the `jwtauth.js` file:

- **SERVER_URL**: The URL of your Passbolt server (replace the placeholder with your actual server's URL).
- **Private Key**: You need to import the private key of the user that will be used to sign the challenge. Save the private key as `private.key` in the same directory as the script. The private key is required for signing the challenge.
- **userId**: You can find the `userId` in the MySQL database or on the web interface 

#### MySQL
  ```sql
  SELECT id FROM users WHERE username = 'USERNAME';
  ```

#### Users workspace on the interface
  Alternatively, you can get the `userId` from the Passbolt interface by clicking on the user's profile. The URL will look something like:

  ```
  SERVER_URL/app/users/view/uuid
  ```

  The `uuid` at the end of the URL is the `userId`.

- **PRIVATE_KEY_PASSPHRASE**: Replace the `PRIVATE_KEY_PASSPHRASE` variable in the script with the passphrase used to encrypt the private key.

### 3. Running the Script

After configuring the necessary placeholders:

1. **Ensure the private key** file (`private.key`) is in the directory.
2. **Replace the passphrase** in the script with your actual passphrase.
3. Run the script using Node.js:

   ```bash
   node jwtauth.js
   ```

### Example Configuration:

```javascript
const config = {
    serverUrl: 'https://pro.debian12.local',  
    URL_LOGIN: '/auth/jwt/login.json',
    privateKeyPath: 'private.key',  
    userId: 'e5c5a97a-dd65-4f8d-9d15-7daf862818bc'  
};
```

```javascript
[...]
async function performJwtAuth() {
  const passphrase = 'I need to have the high ground'; 
[...]
```

## Troubleshooting

- **Self-signed certificate errors**: If you're using a self-signed SSL certificate, the script has been set up to bypass SSL verification by allowing self-signed certificates. This is not secure for production environments but is fine for local development.
  
- **Invalid credentials**: Ensure that the user ID, private key, and passphrase are correctly configured. Check the Passbolt logs for any additional details.

- **Fetching the public key failed**: If you encounter issues fetching the public key from the server, ensure that the server URL is correct and that your Passbolt server is accessible from your machine.
