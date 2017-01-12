var fs = require('fs');

module.exports = {
    resolveFile: function(requestStr) {
        var pathStart = process.cwd();
        pathStart += '/uploads/';
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
