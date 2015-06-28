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
            if( !data.length ){
                AlertMsg.addMsg( "The are no " + $scope.currentResource +"s available in the Gluu Cluster. Create a new one.", "warning" );
                return;
            }
            // we have a data array
            $scope.contents = data;
            $scope.headers = Object.keys( data[0] );
            // ID is not to be displayed, serves no purpose
            $scope.headers.splice( $scope.headers.indexOf( 'ID' ), 1);
        });


        $scope.deleteResource = function(resource, id){
            $http.delete("/"+resource+"/"+id).success(function(data){
                AlertMsg.addMsg("The "+resource+" with the ID: "+id+" was successfully deleted.", "success");
                return;
            });
        };

}]);


// controller that is used to respond to add/edit actions on resources
webuiControllers.controller( 'ResourceController', ['$scope', '$http', '$routeParams', 'AlertMsg', '$location',
    function($scope, $http, $routeParams, AlertMsg, $location){
        // Clear all alert messages
        AlertMsg.clear();

        $scope.editMode = false;
        $scope.resourceData = {};

        var resource = $routeParams.resource;
        console.info($routeParams);

        if ($routeParams.action == 'edit'){
            if ( typeof $routeParams.id == 'undefined' ){
                AlertMsg.addMsg( "The resource id is empty! Make sure you selected a resource before clicking Edit", "danger" );
                return;
            }
            $scope.editMode = true;
            var id = $routeParams.id;
            $http.get( "/" + resource + "/" + id).success( function(data){
                $scope.resourceData = data;
            });
        }

        $scope.submit = function(){
            var data = $scope.resourceData;

            if( $scope.editMode ){
                $http.post("/" + resource + "/" + data.id, data).success(function(data, status){
                    // redirect to the overview page with a message that things have been updated
                    $location.path('/view/'+resource);
                });
            } else {  // new resource has to be created
                $http.post("/" + resource, data).success(function( data, status){
                    // redirect to the overview page with a message that new cluster was created
                    $location.path('/view/'+resource);
                }).error(function( data ){
                    if ( typeof data.message == 'string'){
                        AlertMsg.addMsg(data.message, 'danger');
                    }
                });
            }
        };
}]);
