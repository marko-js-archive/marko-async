var raptorDust = require('raptor-dust');

exports.registerHelpers = function(dust) {
    raptorDust.registerHelpers({
        'async-fragment': {
            buildInput: function(chunk, context, bodies, params, renderContext) {
                var arg = params.arg = {};

                for (var k in params) {
                    if (params.hasOwnProperty(k)) {
                        if (k.startsWith('arg-')) {
                            arg[k.substring(4)] = params[k];
                            delete params[k];
                        }
                    }
                }

                var dataProvider = params.dataProvider;
                if (typeof dataProvider === 'string') {
                    var dataProviderFunc = context.get(dataProvider);
                    if (dataProviderFunc) {
                        params.dataProvider = dataProviderFunc;
                    }
                }

                params.renderBody = function(out, data) {
                    var varName = params['var'];
                    var newContextObj = {};
                    newContextObj[varName] = data;
                    var newContext = context.push(newContextObj);
                    out.renderDustBody(bodies.block, newContext);
                };

                return params;
            },
            renderer: require('../async-fragment-tag')
        }
    }, dust);
};