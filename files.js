var fs = require('fs');
var pr = require("properties-reader");
var props = pr('/opt/fake-vtj-properties/fake-vtj.properties');
var env = props.get('env');

module.exports = {
    resolveFile: function(requestStr) {
        var pathStart = process.cwd();
        pathStart += '/uploads_';
	pathStart += env;
	pathStart += '/';
        var prefix = '';
        var extension = '';
        var filename = '';

        var arr = [{
            elem: 'Henkilotunnus',
            prefix: 'vtj',
            extension: '.xml'
        }, {
            elem: 'SahkoinenAsiointitunnus',
            prefix: 'vtj_satu',
            extension: '.xml'
        }];

        arr.forEach(function(item) {
            var re = new RegExp('(?::|<)' + item.elem + '>([^<]*)<\/');
            var match = requestStr.match(re);
            if (match) {
                filename = '.';
                filename += match[1];
                prefix = item.prefix;
                extension = item.extension;
            }
        });
        var resultFile = pathStart + prefix + filename + extension;

        try {
            if (fs.statSync(resultFile).isFile()) {
                console.log('FILE exists:' + resultFile);
                return resultFile;
            }
        } catch (err) {
            console.log(requestStr);
            console.log('FILE not exists:' + resultFile);
            return null;
        }
    }
}
