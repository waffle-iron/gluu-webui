var gluuwebui = angular.module('gluuwebui', [
        'ngRoute',
        'webuiControllers'
        ]);

gluuwebui.getTemplate = function(params) {
    var resource = params.resource;
    var template = "";
    switch( resource ){
        case 'license_credentials': template = 'templates/new_license_credential.html';
                                   break;
        case 'licenses': template = 'templates/new_license.html';
                        break;
        case 'providers': template = 'templates/new_provider.html';
                         break;
        case 'clusters': template = 'templates/new_cluster.html';
                        break;
        case 'nodes': template = 'templates/new_node.html';
                     break;
        default: template = 'templates/error.html';
    }
    return template;
}

gluuwebui.config(['$routeProvider', function($routeProvider){
    $routeProvider.
        when('/view/:resource', {
            templateUrl: 'templates/interface.html',
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
