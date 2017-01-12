# e-identification-auth-fake-registry
1st service: upload.js for uploading file for 2nd service for later usage using multipart form or curl. File name suffix must much to 2nd service API subset criteria

2nd service: app.js for reading message through any service API and returning fake (or stub) response by choosing from uploaded files

Start by running:
nodejs app.js 8888

# Getting users

User request with curl:
curl -X POST -d '<Henkilotunnus>210281-9988</Henkilotunnus>' http://localhost:8888/

Returns user xml in 'serve' state, error 404 in 'error' state.

# Setting states

App.js can be set to return 404 errors by using PUT requests. 

Examples:

To put it to normal mode(default):
curl -s -X PUT -d serve localhost:8888

Error mode:
curl -s -X PUT -d error localhost:8888
