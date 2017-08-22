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

var services = JSON.parse(fs.readFileSync('/opt/fake-vtj-properties/services.json', 'utf8'));

var contentTypesByExtension = {
    '.xml': "text/xml; charset=utf-8",
    '.mime': 'multipart/related; charset=UTF-8; boundary=MIME_boundary;',
    '.html': "text/html"
};

var VTJOptions = {
    xroadhost: 'localhost',
    xroadport: 443,
    p12Password: "",
    key: "",
    cert: ""
};

try {
    var props = pr('/opt/fake-vtj-properties/fake-vtj.properties');
    var parsed = url.parse(props.get('xroad_endpoint'));
    VTJOptions.xroadhost = parsed.hostname;
    if (parseInt(parsed.port)) {
        VTJOptions.xroadport = parseInt(parsed.port);
    }
    VTJOptions.p12Password = props.get('p12Password');
} catch (err) {
    console.log('Unable to parse config file: ' + err);
}
console.log("xroad endpoint: " + VTJOptions.xroadhost + ":" + VTJOptions.xroadport);

pem.readPkcs12("/data00/deploy/client.p12", VTJOptions,
    function(e, certs) {
        VTJOptions.key = certs.key;
        VTJOptions.cert = certs.cert;
    });

var requestVTJ = function(response, url, content, VTJOptions) {
    var requestOptions = {
        hostname: VTJOptions.xroadhost,
        port: VTJOptions.xroadport,
        path: url,
        method: 'POST',
        key: VTJOptions.key,
        cert: VTJOptions.cert,
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'text/xml',
            'Content-Length': Buffer.byteLength(content)
        }
    };
    var proxyRes = "";
    var req = https.request(requestOptions, function(res) {
        res.on('data', function(data) {
            proxyRes = proxyRes + data.toString();
        });
        res.on('end', function() {
            var headers = {};
            headers["Content-Type"] = "text/xml";
            response.writeHead(200, headers);
            response.write(proxyRes, "binary");
            response.end();
            return;
        });

    });
    req.write(content);
    req.end();

    req.on('error', function(e) {
        console.error(e);
    });

}

var writeNotFoundErrorResponse = function(res) {
    fs.readFile("error.xml", "binary", function(err, file) {
        var headers = {};
        headers["Content-Type"] = "text/xml; charset=utf-8";
        res.writeHead(200, headers);
        res.write(file, "binary");
        res.end();
    });
}

app.use(bodyParser.raw({inflate: "true", type: "*/*"}));
app.post('/', function (req, res) {
    if (state === "error") {
        console.log("Sending error");
        res.statusCode = 404;
        res.end("Error as requested");
        return;
    } else if (state === "proxy") {
        console.log("Proxying");
        requestVTJ(res, request.url, requestMsg, VTJOptions);
        return;
    } else {
        var dataStr = req.body.toString();
        console.log( req.body.toString() );
        var filename = files.resolveFile(dataStr);
        if (filename) {
            console.log("found file: " + filename);
            fs.readFile(filename, "binary", function(err, file) {
                if (err) {
                	writeNotFoundErrorResponse(res);
                    return;
                }
                var headers = {};
                var contentType = contentTypesByExtension[path.extname(filename)];
                if (contentType) headers["Content-Type"] = contentType;
                res.writeHead(200, headers);
                res.write(file, "binary");
                res.end();
            });
        } else {
            writeNotFoundErrorResponse(res);
            return;
        }
    }
});
app.get('/api', function (req, res) {
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

app.get('/api/help', function (req, res) {
	res.write("/api?logs=delete empties logs\n");
	res.write("/api/fake-vtj?state=proxy sets fake-vtj state to forward to vtj\n");
	res.write("/api/fake-vtj?state=serve sets fake-vtj state to serve fake data\n");
	res.write("/api/fake-vtj?state=error sets fake-vtj state to return 404 error\n");
	res.write("/api/services/list lists status of all services\n");
	res.write("/api/services/<service (e.g idp)> shows service status\n");
	res.write("/api/services/<service (e.g idp)>?command=start starts service docker container\n");
	res.write("/api/services/<service (e.g idp)>?command=stop stops service docker container\n");
    res.end();
})

app.get('/api/fake-vtj', function (req, res) {
	console.log( req.query );
	if ( Object.keys(req.query).length === 0 ) {
		res.write( JSON.stringify({ state: state }) );
	    res.end();		
	} else if (req.query.state === "proxy" ) {
		state = "proxy";
		res.write(state);
	    res.end();
	} else if (req.query.state === "serve" ) {
		state = "serve";
		res.write(state);
	    res.end();
	} else if (req.query.state === "error" ) {
		state = "error";
		res.write(state);
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

var serviceList =  Object.keys(services);
app.get('/api/services/list', function (req, res) {
	var containerStatList = [];
	for (var i = 0; i < serviceList.length; i++) {
		containerStatList.push(getContainerStats(services[serviceList[i]]["container"], serviceList[i]));
	}
	res.write(JSON.stringify(containerStatList, null, 4));
	console.log(JSON.stringify(containerStatList, null, 4));
    res.end();
})

for (var i = 0; i < serviceList.length; i++) {
	app.get('/api/services/' + serviceList[i], function (req, res) {
		var currentService = path.basename(req.path);
		var containerName = services[ currentService ][ "container" ];
		var containerStats = getContainerStats(containerName, currentService);
		if (req.query.command === "start" ) {
			var startResult = execSync("docker start " + containerName);
			console.log(startResult.stdout + "\n" + startResult.stderr);
		} else if (req.query.command === "stop" ) {
			var stopResult = execSync("docker stop " + containerName);
			console.log(stopResult.stdout + "\n" + stopResult.stderr);
		}
		var containerStats = getContainerStats(containerName, currentService);
		console.log(JSON.stringify(containerStats));
		res.write(JSON.stringify(containerStats, null, 4) );
		res.end();
	})
}


var server = app.listen(port, "0.0.0.0", function () {
   var host = server.address().address
   var port = server.address().port

   console.log("Example app listening at http://%s:%s", host, port)
})

console.log("server running at\n  => http://localhost:" + port);
