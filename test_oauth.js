/*
*   OAuth2 tester with Google Chrome Headless (puppeteer):
*    - automatic form submitting
*    - exchange the authorization code with an access token
*    - Use the access token to request the API 
*    - Try to reuse the authorization code (it should fail)
*   
*   Oscar Bataille 2018
*/
const puppeteer = require('puppeteer');
const url = require('url');
const request = require('request');
//Check if parameters are set
if (typeof process.argv[2] === 'undefined' || typeof process.argv[3] === 'undefined') {
    console.log("Usage: "+process.argv[0]+" "+process.argv[1]+"  username pasword ");
    process.exit();
}

//Client domain (the one that will USE the API);
const CLIENT_DOMAIN = 'client.com';
//OAUTH SERVER, the one that will SERVER the API
const SERVER_DOMAIN = 'server.com'
//Server redirect URI + access token endpoint 
const redirectUri = 'https://' +CLIENT_DOMAIN + '/client_authenticate';
const accessTokenEndpoint = 'http://'+SERVER_DOMAIN+'/access_token';
//Set the API endpoint 
const apiEndpoint = 'http://'+SERVER_DOMAIN+'/api/test';
//Set the client 
const clientId = 'SET CLIENT ID HERE';
const clientSecret = 'SET CLIENT SECRET HERE';
// Generate CSRF token
const csrf = Math.random().toString(36).substring(7);
//OAUTH2 login endpoint
const endpoint = 'http://'+SERVER_DOMAIN+'/authorize?response_type=code&client_id='+clientId+'&redirect_uri='+redirectUri+'&state=' + csrf;
 
//Selectors for the login page
const LOGIN_INPUT_SELECTOR = 'input[name="username"]';
const PASSWORD_INPUT_SELECTOR = 'input[name="password"]';
const SUBMIT_BUTTON_SELECTOR ='button[type="submit"]';

(async () => {
    const browser = await puppeteer.launch({
        headless: true, // Set to false if needed
        slowMo: 0, // Set to slow down puppeteer script so that it's easier to follow visually
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1300,
        height: 750
    });
    console.log("Accessing OAuth2 endpoint ( "+SERVER_DOMAIN+" )  ...");
    await page.goto(endpoint, {
        waitUntil: 'load',
    });
    console.log("Loaded ! \n\n");
    //Type username and password
    await page.type(LOGIN_INPUT_SELECTOR, process.argv[2]);
    await page.type(PASSWORD_INPUT_SELECTOR, process.argv[3]);
    //Check the login response
    page.on('response', response => {
        /*
        *   !! ADD YOUR OWN CUSTOM CODE to intercept responses (ex: if the login credentials are wrong )
        */
        // if (response.url().includes('/ajax-') && response.url().includes(SERVER_DOMAIN)) {
        //     //Try to decode to json
        //     response.json().then(respObj => {
        //         if (respObj.errors.length) {
        //             for (let [key, value] of Object.entries(respObj.errors)) {
        //                 console.log('!!! Ajax error: ' + value);
        //             }
        //             exit(browser);
        //         }
        //     }).catch(err => {
        //         //If undefined inex or anything else: Show raw version
        //         response.text().then(text => {
        //             console.log('Ajax unparseable response: ' + text);
        //         });
        //         exit(browser);
        //     });
        // }
    });
    //Send login
    await page.click(SUBMIT_BUTTON_SELECTOR);
    //Wait for the redirect to occur
    await page.waitForNavigation();
    //Extract auth code from url
    var authCode = url.parse(page.url(), true).query.code;
    console.log("Auth code: " + authCode + " \n\n");
    //Check csrf token
    if (url.parse(page.url(), true).query.state != csrf) {
        console.log("Wrong csrf token \n\n");
    }
    console.log('Going to exchange the auth code with an access token... \n');
    request.post(accessTokenEndpoint, {
        form: {
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code: authCode
        }
    }, async function(error, response, body) {
        try{
             var accessToken = JSON.parse(body).access_token;
         }catch(err){
            //On json parse error
            console.log('Access token parse error: '+response);
            exit(browser);
         }
       
        console.log("Access token: " + accessToken + " \n\n");
        console.log('Success ! Now we are going to use that access token to request the api\n');
        // //Test access token 
        await requestApi(accessToken);
        // //Try to reuse the auth code
        await tryToReuseAuthCode(authCode);
    });
    await browser.close();
})();
/*
 *   Close the browser and exit
 */
function exit(browser) {
    browser.close().then(whatever => {
        process.exit();
    });
}
/*
 *   Test the access token 
 */
function requestApi(access_token) {
    return new Promise(function(resolve, reject) {
        request({
            url: apiEndpoint,
            headers: {
                'Authorization': ' Bearer ' + access_token
            }
        }, function(error, response, body) {
            console.log("API endpoint (must be a valid JSON response) : ", body, '\n');
            try {
                var apiData = JSON.parse(body);
                for (let [key, value] of Object.entries(apiData)) {
                    console.log( key + ' : ' + value);
                }

                //Resolve
                resolve();
            } catch (err) {
                console.log('Could not json decode the api response');

                //Exit directly
                exit(browser);
            }
        });
    });
}
/*
 *   Try to reuse the authcode
 */
function tryToReuseAuthCode(authCode) {
    return new Promise(function(resolve, reject) {
        console.log('\n\nNow let\'s try to reuse the auth code, the server should fail.');
        request.post(accessTokenEndpoint, {
            form: {
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                code: authCode
            }
        }, function(err, response, body) {
            //try to parse the JSON body 
            try {
                let resp = JSON.parse(body);
                console.log(resp);
                reject();
            } catch (err) {
                // If there is no JSON body 
                console.log('It seems that the server did not reused the auth code, good!', body, '\n');
                resolve();
            }
        });
    });
}