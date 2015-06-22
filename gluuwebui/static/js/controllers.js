var webuiControllers = angular.module('webuiControllers', ['ui.bootstrap']);

webuiControllers.service('AlertMsg', ['$rootScope', function( $rootScope ){
    var service = {
        alerts : [],
        addMsg: function( message, type ){
            if( typeof message == 'undefined' || typeof type == 'undefined' ){
                console.error('An alert with insufficient parameters was passed. Requires (message, type)' );
                return false;
            }
            var item = { msg: message, type: type };
            var index = service.alerts.push( item ) - 1;
            $rootScope.$broadcast( 'alerts.update' );
            return index;
        },
        removeMsg: function( index ){
            service.alerts.splice( index, 1 );
            $rootScope.$broadcast( 'alerts.update' );
        },
        clear: function(){
            service.alerts = [];
            $rootScope.$broadcast( 'alerts.update' );
        }
    };

    return service;
}]);

webuiControllers.controller('AlertController', ['$scope', 'AlertMsg',
    function( $scope, AlertMsg ){
        $scope.$on( 'alerts.update', function( ev ){
            $scope.alerts = AlertMsg.alerts;
        });
        $scope.alerts = AlertMsg.alerts;

        $scope.closeAlert = function(index){
            AlertMsg.removeMsg(index);
        };
}]);

// Controller to load resources when requested
webuiControllers.controller('OverviewController', ['$scope', '$http', '$routeParams', 'AlertMsg',
    function($scope, $http, $routeParams, AlertMsg){
        // Clear the alerts
        AlertMsg.clear();

        var resource = $routeParams.resource;
        $scope.currentResURI = resource;
        $scope.currentResource = resource.charAt(0).toUpperCase() + resource.slice(1).replace("_", " ");

        // get the overview table and update the headers and rows
        $http.get('/'+resource).success( function( data ){
            $scope.contents = data;
        });

}]);

// controller that is used to respond to add/edit actions on resources
webuiControllers.controller( 'ResourceController', ['$scope', '$http', '$routeParams', 'AlertMsg',
    function($scope, $http, $routeParams, AlertMsg){
        // Clear all alert messages
        AlertMsg.clear();

        $scope.editMode = false;
        $scope.provider = {};

        var resource = $routeParams.resource;

        if ($routeParams.action == 'edit'){
            if ( typeof $routeParams.id == 'undefined' ){
                AlertMsg.addMsg( "The resource id is empty! Make sure you selected a resource before clicking Edit", "danger" );
                return;
            }
            $scope.editMode = true;
            var id = $routeParams.id;
            $http.get( "/" + resource + "/" + id).success( function(data){
                $scope.provider = data;
            });
        }

        $scope.submit = function(){
            var data = $scope.provider;
            console.log(data.id);
        };

}]);
