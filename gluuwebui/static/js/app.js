var gluuwebui = angular.module('gluuwebui', [
        'ngRoute',
        'webuiControllers'
        ]);

var templateMaker = {};
templateMaker.getTemplate = function(params) {
    var resource = params.resource;
    var action = params.action;
    var template = '';
    if (action == 'new' || action == 'edit') {
        template = templateMaker.newTemplates[resource];
    } else if( typeof action === 'undefined' ){
        template = templateMaker.viewTemplates[resource];
    }
    // if the url resource doesn't match anything from the objects
    if( template === '' || typeof template === 'undefined' ){
        template = 'templates/404.html';
    }
    return template;
};

templateMaker.newTemplates = {
         'license_keys': 'templates/new_license_key.html',
         'licenses': 'templates/new_license.html',
         'providers': 'templates/new_provider.html',
         'clusters': 'templates/new_cluster.html',
         'nodes': 'templates/new_node.html',
};

templateMaker.viewTemplates = {
         'providers':  'templates/providers.html',
         'licenses':  'templates/licenses.html',
         'license_keys':  'templates/license_keys.html',
         'clusters':  'templates/clusters.html',
         'nodes':  'templates/nodes.html'
};

gluuwebui.config(['$routeProvider', function($routeProvider){
    $routeProvider.
        when('/', {
            templateUrl: 'templates/dashboard.html'
        }).
        when('/:resource', {
            templateUrl: templateMaker.getTemplate,
            controller: 'OverviewController'
        }).
        when('/:action/:resource/:id?', {
            templateUrl: templateMaker.getTemplate,
            controller: 'ResourceController'
        }).
        otherwise({
            templateUrl: 'templates/404.html'
        });
}]);
