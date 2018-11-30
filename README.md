# My Banking App

[![Build Status](https://travis-ci.org/mayankamencherla/banking-app.svg?branch=master)](https://travis-ci.org/mayankamencherla/banking-app)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://GitHub.com/Naereen/StrapDown.js/graphs/commit-activity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- [![Packagist](https://img.shields.io/packagist/v/symfony/symfony.svg)]() -->

> This app is a backend that manages your user's financial data using Truelayer's
secure banking API's over HTTP.

<p align="center">
	<a href="https://truelayer.com">
		<img src="https://pbs.twimg.com/media/C4n_ff0WIAIYqNj.jpg" />
    </a>
</p>

## Pre-requisities:
> Some key things to set up / understand to use this app:

- **[NodeJS v9](https://nodejs.org/en/)**
- **[npm](https://www.npmjs.com/)**
- **[Truelayer](https://console.truelayer.com/?auto=signup)**
- **[Docker](https://hub.docker.com/)**

## Downloading
```bash
$ git clone https://github.com/mayankamencherla/truelayer-interview-app.git
```

## Setup Locally
> To get the app working locally, or to run test cases, follow the instructions below.
> After setting up the app, details on each API and how to use it can be found below in the **[API's available on this app](https://github.com/mayankamencherla/truelayer-interview-app#apis-available-on-this-app)** section.
> If any of the commands below are denied due to a permission error, please prepend a sudo to the command.

1. Navigate to the app's root directory

2. Run the following command to install all the dependencies:
```bash
$ npm install
```

3. Copy over .env.sample to .env in the root of the project
```bash
$ cp .env.sample .env
```

4. Change the values of the environment variables in .env file based on requirement. Please **[sign-up](https://console.truelayer.com/?auto=signup)** for Truelayer and input your clientId and secret in this file. These variables are required for the app to run. More details **[here](https://github.com/mayankamencherla/truelayer-interview-app#environment-variables)**.

5. Set up redis on your machine from **[here](https://redis.io/topics/quickstart)**. Redis needs to be started using *redis-server* for the app to work fully.

6. Set up mysql on your machine from **[here](https://dev.mysql.com/doc/mysql-getting-started/en/)**

7. Log in to your mysql instance locally, and run the following commands:
```sql
mysql> DROP DATABASE IF EXISTS banking_app;
mysql> CREATE DATABASE banking_app;
```

8. To get your local mysql to bind to the app, you must first copy over the sample knexfile. The app has `root@password` as the default configuration, which must be changed in development to suit the credentials on your local MySQL instance. You can change this in the **[knexfile-sample.js](http://knexjs.org/#knexfile)** file before executing the command below:
```bash
$ cd server && cp knexfile-sample.js knexfile.js && cd ..
```

9. The final step in setting up the DB is to run migrations. Please use the following commands from the app's root directory:
```bash
$ npm i knex -g
$ cd server && knex migrate:latest && cd ..
```
- If the command above doesn't work, please try running the command below:
```bash
$ npm run migrate
```

10. Run the app on localhost by typing the following command:
```bash
$ npm start
```

11. Head over to <a href="http://localhost:3000" target="_blank">localhost:3000</a> on your browser to use the app

12. To test out the <a href="http://localhost:3000/user/transactions" target="_blank">/user/transactions</a> and <a href="http://localhost:3000/user/transactions/stats" target="_blank">/user/transactions/stats</a> routes, the recommended tool would be **[Postman](https://www.getpostman.com/apps)**

13. After setting up the app locally, you could alternatively run the app via Docker. Please use the commands below to do that:
```bash
$ sudo docker-compose build
$ sudo docker-compose up
```
> Note: The sudo docker-compose up command would likely fail to set up MySQL the first time after running the build command. Please exit, and run the command again when this happens.

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

## Run using **[Docker](https://hub.docker.com/)**

The docker image for this app is available for download from our docker hub. You must have Docker installed in your
system. Docker has extensive <a href="https://docs.docker.com/installation/" target="_blank">installation guideline for
popular operating systems</a>. Choose your operating system and follow the instructions.

> Ensure you that you have docker installed and running in your system before proceeding with next steps. A quick test
> to see if docker is installed correctly is to execute the command `docker run hello-world` and it should run without
> errors.

1. Set up the MySQL container
```bash
$ sudo docker run -e MYSQL_DATABASE='banking_app' -e MYSQL_ROOT_PASSWORD='password' -d --name mysql mayankamencherla/bankingapp_mysql:latest
```
2. Set up the Redis container
```bash
$ sudo docker run -d --name redis redis
```
3. Set up the app container and link it to the MySQL and Redis containers
```bash
$ sudo docker run -e NODE_ENV=production --link mysql:mysql --link redis:redis --rm -p 3000:3000 mayankamencherla/banking_app:latest
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
> Note: CTR mode requires that every encryption / decryption must happen with a unique secure IV. An IV used once to encrypt an access_token, can only be used once to decrypt it for usage, and then should be discarded. A new IV must be generated each time after the old one is used, and must be used to re-encrypt the access_token, and so on. Currently, this is not the case, as the same IV is used over and over again. Another industry standard encryption scheme for this use case is the **[AES-GCM](https://crypto.stanford.edu/RealWorldCrypto/slides/gueron.pdf)** algorithm, which is an envelope encryption algorithm for authenticated encryption.

## API's available on this app
> This app supports 3 API's currently

1. GET <a href="http://localhost:3000" target="_blank">/</a>
    - allows you to sign up on the app using Truelayer's oAuth2.0 authentication / authorization flow.
    - Returns an app auth token as a header (`x-auth`)
    - The returned header must be stored to make subsequent requests on behalf of the registered user.

2. GET <a href="http://localhost:3000/user/transactions" target="_blank">/user/transactions</a>
    - allows you to fetch signed up user's transactions using app token generated in the step above.
    - Valid app token must be sent as `x-auth` header and is used to authenticate the user.
    - Programmatically check the `x-auth` header in the response to ensure new token is saved when generated. New token token generation happens when Truelayer access token is expired.
    - The API returns all of the user's transactions across accounts

3. GET <a href="http://localhost:3000/user/transactions/stats" target="_blank">/user/transactions/stats</a>
    - allows you to generate statistics based on the transactions saved in the API above.
    - Valid app token must be sent as `x-auth` header and is used to authenticate the user.
    - API must be called after user/transactions API has been called at least once, as this API simply pulls the information out from the DB / Redis
    - The API returns the user's transaction stats grouped by transaction category, across accounts
