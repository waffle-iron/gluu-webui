var gluuwebui = angular.module('gluuwebui', [
        'ngRoute',
        'webuiControllers'
        ]);

gluuwebui.getTemplate = function(params) {
    var resource = params.resource;
    var action = params.action;
    if (action == 'new' || action == 'edit') {
        return gluuwebui.newTemplates[resource];
    } else {
        return gluuwebui.viewTemplates[resource];
    }
};

gluuwebui.newTemplates = {
         'license_keys': 'templates/new_license_key.html',
         'licenses': 'templates/new_license.html',
         'providers': 'templates/new_provider.html',
         'clusters': 'templates/new_cluster.html',
         'nodes': 'templates/new_node.html',
};

gluuwebui.viewTemplates = {
         'providers':  'templates/providers.html',
         'licenses':  'templates/licenses.html',
         'license_keys':  'templates/license_keys.html',
         'clusters':  'templates/clusters.html',
         'nodes':  'templates/nodes.html'
};

gluuwebui.config(['$routeProvider', function($routeProvider){
    $routeProvider.
        when('/view/:resource', {
            templateUrl: gluuwebui.getTemplate,
            controller: 'OverviewController'
        }).
        when('/:action/:resource/:id?', {
            templateUrl: gluuwebui.getTemplate,
            controller: 'ResourceController'
        }).
        otherwise({
            redirectTo: '/'
        });
}]);
