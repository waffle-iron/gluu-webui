var gluuwebui = angular.module('gluuwebui', [
        'ngRoute',
        'webuiControllers',
        'ui.bootstrap'
        ]);

var templateMaker = {};
templateMaker.getTemplate = function(params) {
    var resource = params.resource;
    var action = params.action;
    var template = '';
    if (action == 'new' || action == 'edit') {
        template = templateMaker.newTemplates[resource];

        // in case of the providers we get the provider driver as the id value when parsing the url
        if (resource === 'providers'){
            template = template[params.id]
        }
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
         'providers': {
             'digitalocean': 'templates/new_do_provider.html',
             'generic': 'templates/new_generic_provider.html'
         },
         'clusters': 'templates/new_cluster.html',
         'nodes': 'templates/new_node.html',
         'containers': 'templates/new_container.html'
};

templateMaker.viewTemplates = {
         'providers':  'templates/providers.html',
         'license_keys':  'templates/license_keys.html',
         'clusters':  'templates/clusters.html',
         'nodes':  'templates/nodes.html',
         'containers': 'templates/containers.html'
};

gluuwebui.config(['$routeProvider', function($routeProvider){
    $routeProvider.
        when('/', {
            templateUrl: 'templates/dashboard.html',
            controller: 'DashboardController'
        }).
        when('/container_logs/:id/:action', {
            templateUrl: 'templates/container_log.html',
            controller: 'ContainerLogController'
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
