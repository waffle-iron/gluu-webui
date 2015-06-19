var gluuwebui = angular.module('gluuwebui', [
        'ngRoute',
        'webuiControllers'
        ]);


gluuwebui.config(['$routeProvider', function($routeProvider){
    $routeProvider.
        when('/view/:resource', {
            templateUrl: 'templates/interface.html',
            controller: 'ResourceController'
        }).
        when('/license_credential/:action/:id', {
            templateUrl: 'templates/new_license_credential.html',
            controller: 'CredsController'
        }).
        when('/license/:action/:id',{
            templateUrl: 'templates/new_license.html',
            controller: 'LicenseController'
        }).
        when('/provider/:action/:id',{
            templateUrl: 'templates/new_provider.html',
            controller: 'ProviderController'
        }).
        when('/cluster/:action/:id',{
            templateUrl: 'templates/new_cluster.html',
            controller: 'ClusterController'
        }).
        when('/node/:action/:id', {
            templateUrl: 'templates/new_node.html',
            controller: 'NodeController'
        }).
        otherwise({
            redirectTo: '/'
        });
}]);
