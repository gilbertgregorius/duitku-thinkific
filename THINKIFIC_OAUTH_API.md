## Base URL: https://26ca-180-243-2-236.ngrok-free.app

## Callback URLs:

```
- {base_url}/api/webhooks/duitku

- {base_url}/webhook/thinkific-order

- {base_url}/webhook/thinkific-signup

- {base_url}/api/payment/callback

- {base_url}/api/payment/return
```

### `GET /oauth2/authorize`

**Parameters (Note: Everything is via query)**

```json
{
  "client_id": "string",
  "redirect_uri": "string",
  "response_mode": "query, post_form",
  "response_type": "code, id_token, code id_token",
  "scope": "openid, profile, email and site",
  "nonce": "string value used by the client server to verify ID_Token an avoid replay attacks. (e.g. woid29jjJB1bb)",
  "state": "state parameter for oauth, the value passed in state will be returned to the application",
  "code_challenge": "a base64 url encoded and hashed version of the previously generated code verifier random string",
  "code_challenge_method": "S256"
}
```

**Responses**

`200`: renders page to user so them can give access to the app

`302`: redirects back to app when user already authorized app

`401`: Unauthorized access

### `POST /oauth2/token`

```json
{
  "grant_type": "authorization_code",
  "code": "string",
  "refresh_token": "string",
  "redirect_uri": "string",
  "code_verifier": "string"
}
```

**Responses: HTTP 200 OK**

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "string",
  "gid": "string",
  "expires_in": 0
}
```

### `POST /oauth2/revoke`

**Request body: application/x-www-form-urlencoded**

**Responses: HTTP 200 OK**

## Step-by-step

### Step 1: Generate code verifier, code challenge method and code challenge

code_verifier A dynamically created cryptographically random key and it should be unique for every authorization request.
code_challenge_method Is used to generate the code challenge, "S256" is the standard at Thinkific.
code_challenge Is a hashed version of the code verifier, using the code challenge method algorithm and base64url-encoded.

### Step 2: Ask for permissions from the Thinkific Site Owner with code challenge and code challenge method

Requesting Access

`https://{subdomain}.thinkific.com/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_mode=query&response_type=code&state={state}&code_challenge={code_challenge}&code_challenge_method={code_challenge_method}`

### Step 3: Confirm authorization code

`{redirect_uri}?code={authorization_code}&subdomain={subdomain}&state={state}`

### Step 4: Retrieving access token

`POST https://{subdomain}.thinkific.com/oauth2/token`

Basic Authentication:
The token request should be authenticated by using the Basic Authentication method, using the Client ID and Client Secret encoded in base64.

Please note that Client Secret is optional for the Authorization Code with PKCE, but it's required if you want to receive the refresh token.

`base64(client_id:client_secret)`

The resulting example should be something like:

`Authorization: Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=`

**Request param**

```json
{
  "grant_type": "authorization_code",
  "code": "5a3c34512703ee80eb006dd255c0345a",
  "code_verifier": "l2sdelBTs0cQiUJH-kjVxaxCv994o7gvqATmrGlru78"
}
```

**Response**

```json
{
  "access_token": "5a16505d-5ee5-4853-8cb9-41b63a13a291",
  "token_type": "bearer",
  "refresh_token": "3cb103dd-f05f-43a9-aa51-c33b8f1f2546",
  "expires_in": 86399,
  "gid": "703ca109-741c-40d2-9cf0-3ac51c63086b"
}
```

## Snapshots

### Install & Callback Endpoints without Open ID

```javascript
// INSTALL ENDPOINT
app.get('/install', (request, response) => {
    const subdomain = request. query.subdomain
    const redirect_uri = 'https://my.cool.app/auth/callback'
    
    response.redirect('https://${subdomain}.thinkific.com/oauth2/authorize?\
    client_id=${process.env.CLIENT_KEY}&\
    redirect_uri=$(redirect_uri}&\
    response_mode=query&\
    response_type=code'
    );
})
```

```javascript
// CALLBACK ENDPOINT
app.get('/auth/callback', (req, res) => {
    const json = JSON.stringify({
        grant_type: 'authorization_code',
        code: req.query.code,
    });

    const authkey = Buffer.from(
        process.env.CLIENT_KEY + ":" + process.env.CLIENT_SECRET)
    .tostring('base64');

    // RETRIEVE ACCESS TOKEN
    const tokenResponse = https
    .post('https://${req.query.subdomain).thinkific.com/oauth2/token', json, {
        headers: {
          Authorization: 'Basic ' + authKey, 'Content-Type': 'application/json',
        }
    })
    },
    // find access token at tokenResponse.data.access_token
);
```

### Install & Callback Endpoints with Open ID

```javascript
// MyCoolApp's PKCE INSTALL Endpoint with OPEN ID (ExpresJS)
app.get('/install', (reg, res) => {
    // GENERATE RANDOM STRING FOR CODE VERIFIER
    const code_verifier = randomstring.generate (128);
    const base64Digest = crypto
        .createHash('sha256')
        .update(code_verifier)
        .digest ('base64');
    
    // HASHED CODE VERIFIER VIA S256 METHOD & BASE64 ENCODE
    const code_challenge = base64url.fromBase64 (base64Digest) ;
    const state = code_verifier;
    const subdomain = reg query • subdomain;
    const redirect_uri = 'https://my.cool.app:$(port)/auth/callback';
    
    res.redirect(
        'https://$(subdomain).thinkific.com/oauth2/authorize?\
        client_id=$(process.env.CLIENT_KEY}&\
        redirect_uri=$(redirect_uri)&\
        state=$(state}&\
        response_mode=query&\
        response_type=code id_token&\
        code_challenge=$(code_challenge)&\
        code_challenge_method=S256&\
        scope=openid profile email'
    );
});
```

```javascript
// CALLBACK ENDPOINT
app.get('/auth/callback', (req, res) => {
    const json = JSON.stringify({
        grant_type: 'authorization_code',
        code: req.query.code,
    });

    const authkey = Buffer.from('${process.env.CLIENT_KEY}:').tostring('base64');

    // RETRIEVE ACCESS TOKEN
    const tokenResponse = https
    .post('https://${req.query.subdomain).thinkific.com/oauth2/token', json, {
        headers: {
          Authorization: 'Basic ' + authKey, 'Content-Type': 'application/json',
        }
    })
    },
    // find access token at tokenResponse.data.access_token
    // find id token at tokenResponse.data.id_token
);
```