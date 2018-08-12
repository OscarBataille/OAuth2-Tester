# OAuth2-Tester
Tester for the OAuth2 Authorization Code grant flow written with Node and Puppeteer (Chrome Headless)
This script will test for the full Authorization Code Grant flow:
- Automatic form submitting on the OAuth2 server for logging in
- Exchanging the authorization code with an access token 
- Use the access token to request the api (It must be a valid JSON response on success)
- It will finally try to reuse the Authorization Code to check if it has succesfully been invalidated



## Getting started
1. Install NodeJS 
2. Install [Puppeeteer](https://github.com/GoogleChrome/puppeteer):
`npm i puppeteer`
3. Set the variables in the script.
4. Modify the code that test the API or add a custom repsonse handler (ex: on login fail).
4. Run the script with:
`node test_oauth.js YOUR_USERNAME YOUR_PASSWORD`
