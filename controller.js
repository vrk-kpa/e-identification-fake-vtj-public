'use strict';
var files = require('./files.js');
var https = require("https"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    pr = require("properties-reader"),
    httpProxy = require("http-proxy"),
    pem = require('pem'),
    express = require('express'),
    bodyParser = require('body-parser'),
    app = express(),
    execSync = require('sync-exec'),
    port = process.argv[2] || 8080;
var state = "serve";

var contentTypesByExtension = {
    '.xml': "text/xml; charset=utf-8",
    '.mime': 'multipart/related; charset=UTF-8; boundary=MIME_boundary;',
    '.html': "text/html"
};


app.get('/fake-vtj/api', function (req, res) {
	if (req.query.logs == "delete") {
		var clean1 = execSync("rm /tmp/logs/*/*.log.*");
		var clean2 = execSync("find /tmp/logs/ -type f | while read f; do echo -n '' > $f; done ");
		res.write("Emptied logfiles\n");
	    res.end();		
	} else {
		console.log(req.query);
		res.write("Not implemented");
	    res.end();
	}
})

app.get('/fake-vtj/api/help', function (req, res) {
	res.write("/api?logs=delete empties logs\n");
	res.write("/api/fake-vtj1?command=stop stops fake-vtj1\n");
	res.write("/api/fake-vtj1?command=run starts fake-vtj1\n");
	res.write("/api/fake-vtj2?command=stop stops fake-vtj2\n");
	res.write("/api/fake-vtj2?command=run starts fake-vtj2\n");
    res.end();
})

app.get('/fake-vtj/api/fake-vtj1', function (req, res) {
	console.log( req.query );
	if ( Object.keys(req.query).length === 0 ) {
		res.write( JSON.stringify({ state: state }) );
	    res.end();		
	} else if (req.query.command === "stop" ) {
		var result= execSync("forever stop fake-registry").stdout;
		res.write(result);
	    res.end();
	} else if (req.query.command === "start" ) {
		var result= execSync("forever start -o /data00/logs/fake-registry.log -e /data00/logs/fake-registry.log -a --uid fake-registry app.js 8080").stdout;
		res.write(result);
	    res.end();
	} else {
		console.log(req.query);
		res.write("Not implemented");
	    res.end();
	}
})
app.get('/fake-vtj/api/fake-vtj2', function (req, res) {
	console.log( req.query );
	if ( Object.keys(req.query).length === 0 ) {
		res.write( JSON.stringify({ state: state }) );
	    res.end();		
	} else if (req.query.command === "stop" ) {
		var result= execSync("forever stop fake-registry2").stdout;
		res.write(result);
	    res.end();
	} else if (req.query.command === "start" ) {
		var result= execSync("forever start -o /data00/logs/fake-registry2.log -e /data00/logs/fake-registry2.log -a --uid fake-registry2 app.js 8081").stdout;
		res.write(result);
	    res.end();
	} else {
		console.log(req.query);
		res.write("Not implemented");
	    res.end();
	}
})
var getContainerStats = function ( containerName, serviceName ) {
	console.log(containerName);
	var containerStats = JSON.parse(execSync("docker ps -a --filter name=" + containerName + " --format '{ \"name\": \"{{ .Names }}\", \"status\": \"{{ .Status }}\", \"image\": \"{{ .Image }}\"}'|grep '\"" + containerName + "'").stdout);
	var imageInfo = JSON.parse(execSync("docker inspect " + containerStats["image"] ).stdout);
	containerStats["git-branch"] = imageInfo[0]["Config"]["Labels"]["git-branch"];
	containerStats["service"] = serviceName;
	return containerStats;
}


var server = app.listen(port, "0.0.0.0", function () {
   var host = server.address().address
   var port = server.address().port

   console.log("Example app listening at http://%s:%s", host, port)
})

console.log("server running at\n  => http://localhost:" + port);
