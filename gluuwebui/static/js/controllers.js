var webuiControllers = angular.module('webuiControllers', []);

// Controller to load resources when requested
webuiControllers.controller('ResourceController', ['$scope', '$http', '$routeParams',
    function($scope, $http, $routeParams){
        var res = $routeParams.resource;
        $scope.currentResURI = res;
        $scope.currentResource = res.charAt(0).toUpperCase() + res.slice(1).replace("_", " ");


        //$http.get('/'+resource).success(function(data){
            
        //});
}]);
