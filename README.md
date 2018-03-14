# My Banking App
> This app is a backend that manages your user's financial data using Truelayer's
secure banking API's over HTTP.

## Downloading
```bash
$ git clone https://github.com/mayankamencherla/truelayer-interview-app.git
```

## Setup Locally
> To get the app working locally, or to run test cases, follow the instructions below:

1. Navigate to the app's folder

2. Run the following command to install all the dependencies:
```bash
$ npm install
```

3. Copy over .env.sample to .env in the root of the project
```bash
$ cp .env.sample .env
```

4. Change the values of the environment variables in .env file based on requirement. Please **[sign-up](https://console.truelayer.com/?auto=signup)** for Truelayer and input your clientId and secret in this file. These variables are required for the app to run.

5. Set up redis on your machine from **[here](https://redis.io/topics/quickstart)**. Redis needs to be started using *redis-server* for the app to work fully.

6. Set up mysql on your machine from **[here](https://dev.mysql.com/doc/mysql-getting-started/en/)**

7. Log in to your mysql instance locally, and run the following commands:
```sql
mysql> DROP DATABASE banking_app;
mysql> CREATE DATABASE banking_app;
```

8. To get your local mysql to bind to the app, you must first copy over the sample knexfile. The app has root@password as the default configuration, which must be changed in development to suit the credentials on your local MySQL instance. You can change this in the **[knexfile-sample.js](http://knexjs.org/#knexfile)** file before executing the command below:
```bash
$ cd server && cp knexfile-sample.js knexfile.js && cd ..
```

9. The final step in setting up the DB is to run migrations. Please use the following command from the app's root directory:
```bash
$ cd server && knex:migrate latest && cd ..
```

10. Run the app on localhost by typing the following command:
```bash
$ npm start
```

11. Head over to localhost:3000 on your browser to use the app

12. To test out the /user/transactions and /user/statistics routes, the recommended tool would be **[Postman]**(https://www.getpostman.com/apps)

## Run tests
1. To run tests the following command would work:
```bash
$ npm test
```
2. But many tests require a valid Truelayer access token. These tests can run by following the steps outlined below:
```
    a. Head over to the AuthenticationController.js file
    b. console.log(tokens) right below line 26
    c. Open localhost:3000 after setting up the app using the instructions above
    d. Complete the authentication / authorization flow
    e. The terminal's logs will contain the access_token and renewal_token
    f. Copy them over to the .env file and paste them in their respect places
    g. Run npm test to see all the tests executing
```

## Logging
Logging is set up already in the app using **[winston](https://www.github.com/winstonjs/winston)**
The application's logger will log to `storage/logs/debug.log` as a json

## Environment variables
Environment variables are picked up from the .env file, which must be created in the app's root directory. The root directory has a sample file called .env.sample that contains all the necessary config variables, but they must be changed in the .env file correctly for the application to work

Some key environment variables are listed and explained below:

1. *CLIENT_ID* is the Truelayer API client ID which must be generated after signing **[here](https://console.truelayer.com/)**

2. *CLIENT_SECRET* is the Truelayer API client secret, which can be retreived from the account after signing up using the link above

3. *REDIRECT_URI* is the url that must be sent to Truelayer which is will get the callback response after user access / rejects app authorization

4. *JWT_SECRET* is the secret used to generate the app's json web token

5. *AES_KEY* is the key used to encrypt and decrypt Truelayer's access and refresh token before storing in the DB / after retreiving from the DB, and the string needs to be of length 32 (256 bits) as we are using AES-256-CTR mode

6. *AES_IV* is the initialization vector used for AES, and needs to be of length 16 (128 bits)

## Securely storing Truelayer tokens
> Truelayer's access and refresh tokens are stored in the DB, which means they can be compromised if not stored securely. The points below outline the steps taken by the application to store the OAuth2.0 tokens securely in the DB.

1. Truelayer's access / refresh tokens are encrypted using the **[AES-256-CTR](http://web.cs.ucdavis.edu/~rogaway/papers/modes.pdf)** algorithm before storing in the DB. This step requires that the unique key must be updated in the *AES_KEY* environment variable in the .env file. A random IV must also be updated in the *AES_IV* environment variable.

2. When the app token is sent across to the API's, during the authentication step, we decrypt the encrypted Truelayer tokens using the AES-256-CTR algorithm again before sending it to Truelayer for further processing

3. There is currently a security breach in the methodology used above. This is outlined below:
> Note: CTR mode requires that every encryption / decryption must happen with a unique secure IV, that must be generated specifically for that flow. Currently, this is not the case, as we are re-using the same IV based on the environment variable. The right way to do things would be to generate a new IV for every new token, or re-use of valid token, and use it to encrypt the Truelayer tokens, or re-encrypt the re-used Truelayer tokens. After this, the IV must be encrypted using a public key encryption mode like RSA, and stored in the DB along with the newly encrypted tokens. During authentication, the IV must be decrypted using RSA, and then be used to decrypt the tokens before sending it to Truelayer's APIs.

## API's available on this app
> This app supports 3 API's currently

1. `GET /` allows you to sign up on the app using Truelayer's oAuth2.0 authentication / authorization flow.

2. `GET user/transactions` allows you to fetch signed up user's transactions using app token generated in the step above.

3. `GET user/statistics` allows you to generate statistics based on the transactions saved in the API above.
