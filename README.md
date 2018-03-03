# My Banking App
> This app is a backend that manages your user's financial data using Truelayer's
secure banking API's over HTTP.

<br>

## Downloading
```bash
$ git clone https://github.com/mayankamencherla/truelayer-interview-app.git
```

<br>

## Setup Locally
> To get the app working locally, or to run test cases, follow the instructions below:

1. Navigate to the app's folder

2. Run the following command to install all the dependencies:
```bash
$ npm install
```

3. Copy over .env.sample to .env in the root of the project

4. Change the values of the environment variables in .env file based on requirement

5. Run the app on localhost by typing the following command:
```bash
$ npm start
```

6. Head over to localhost:3000 on your browser to use the app

<br>

## Run tests
```bash
$ npm test
```

<br>

## Logging
Logging is set up already in the app using **[winston](https://www.github.com/winstonjs/winston)**
The application's logger will log to storage/logs/debug.log as a json

<br>

## Environment variables
Environment variables are picked up from the .env file, which must be created in the app's root directory. The root directory has a sample file called .env.sample that contains all the necessary config variables, but they must be changed in the .env file correctly for the application to work

Some key environment variables are listed and explained below:

1. *CLIENT_ID* is the Truelayer API client ID which must be generated after signing **[here](https://console.truelayer.com/)**

2. *CLIENT_SECRET* is the Truelayer API client secret, which can be retreived from the account after signing up using the link above

3. *REDIRECT_URI* is the url that must be sent to Truelayer which is will get the callback response after user access / rejects app authorization

4. *JWT_SECRET* is the secret used to generate the app's json web token

5. *AES_KEY* is the key used to encrypt and decrypt Truelayer's access and refresh token before storing in the DB / after retreiving from the DB.

<br>

## Securely storing Truelayer tokens
> Truelayer's access and refresh tokens are stored in the DB, which means they can be compromised if not stored securely. The points below outline the steps taken by the application to store the OAuth2.0 tokens securely in the DB.

1. Truelayer's access / refresh tokens are encrypted using the **[AES-256-CTR](http://web.cs.ucdavis.edu/~rogaway/papers/modes.pdf)** algorithm before storing in the DB. This step requires that the unique key  must be updated in the AES_KEY environment variable in the .env file

2. When the app token is sent across to the API's, during the authentication step, we decrypt the encrypted Truelayer tokens using the AES-256-CTR algorithm again before sending it to Truelayer for further processing

