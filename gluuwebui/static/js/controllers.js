 webuiControllers = angular.module('webuiControllers', ['ui.bootstrap']);

webuiControllers.service('AlertMsg', ['$rootScope', function( $rootScope ){
    var service = {
        alerts : [],
        addMsg: function( message, type ){
            if( angular.isString(message) && angular.isString(type) ){
                var item = { msg: message, type: type };
                var index = service.alerts.push( item ) - 1;
                $rootScope.$broadcast( 'alerts.update' );
                return index;
            }
            console.error('Invalid params passed. Requires (message<string>, type<string>). You passed (message<'+
                    typeof message+'>, type<'+typeof type+'>).' );
            return false;
        },
        removeMsg: function( index ){
            if( ! angular.isNumber(index) ){
                console.error('Invalid variable type of index. Expected integer but recieved ' + typeof index);
                return;
            }

            if( index >= service.alerts.length ){
                console.error('Cannot remove message at ' + index + '. Exceeds available number of alerts.');
                return;
            }
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
            if( angular.isNumber(index) ){
                AlertMsg.removeMsg(index);
            } else {
                console.error('Function closeAlert(index) accepts only numbers. You passed ' + typeof index);
            }
        };
}]);

function postErrorAlert( Alert, data ){
    try{
        if( angular.isString(data.message) ){
            Alert.addMsg( data.message, "danger" );
        }
        else{
            Alert.addMsg(JSON.stringify(data), "danger");
            console.log('Somebody is sending non standard error data: '+JSON.stringify(data));
        }
    }catch(e){
        Alert.addMsg( "Could not reach the server. Make sure the WEB UI server is running and connected", 'danger');
    }
}

// Controller to load resources when requested
webuiControllers.controller('OverviewController', ['$scope', '$http', '$routeParams', 'AlertMsg',
    function($scope, $http, $routeParams, AlertMsg){
        // Clear the alerts
        AlertMsg.clear();

        var resource = $routeParams.resource;
        $scope.currentResURI = resource;
        $scope.currentResource = resource.charAt(0).toUpperCase() + resource.slice(1).replace("_", " ");

        var resources = ['clusters', 'providers', 'nodes', 'license_keys'];
        if(resources.indexOf(resource) === -1){
            // if it doesnot match it means some random url has been typed out
            // prevent the default http request
            return false;
        }

        // get the overview table and update the headers and rows
        $http.get('/'+resource).success( function( data ){
            if( data.length === 0 ){
                AlertMsg.addMsg( "The are no " + $scope.currentResource +"s available in the Gluu Cluster. Create a new one.", "warning" );
                return;
            }
            $scope.contents = data;
        }).error(function(data){
            postErrorAlert(AlertMsg, data);
        });

        /*
         * If it is a node, fetch the list of clusters and providers for listing against each node
         */
        if( resource === 'nodes' ){
            $http.get('/clusters').success( function(data){
                $scope.clusters = data;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });

            $http.get('/providers').success( function(data){
                $scope.providers = data;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });
        }

        /*
         * Utility function to search and return resource names from ids
         */
        $scope.getResourceName = function( list, id ){
            var name = id;
            angular.forEach(list, function(item){
                if( item.id === id ){
                    // providers donot have name -- they have hostname
                    if('hostname' in item){
                        name = item.hostname;
                        return;
                    }
                    name = item.name;
                    return;
                }
            });
            return name;
        };


        /*
         * Fucntion to delete a resource. This is called whenever a delete button is clicked in the overview UI
         */
        $scope.deleteResource = function(resource, id){
            if (!window.confirm('Are you sure you want to delete the resource?\nThis action cannot be undone.')){
                return;
            }
            $http.delete("/"+resource+"/"+id).success(function(data){
                // remove the resource from the view
                angular.forEach($scope.contents, function(item, index){
                    if( item.id === id ){
                        $scope.contents.splice(index, 1);
                        return;
                    }
                });
                // also remove the details view if present for the same id
                if( angular.isDefined($scope.details) ){
                    // nodes mightnot have ids, instead use their names
                    if( (resource === 'nodes' && $scope.details.id === '' && $scope.details.name == id) ||
                        $scope.details.id === id ) {
                            $scope.details = undefined;
                    }
                }
                // if it is node without an id yet
                AlertMsg.addMsg("The "+resource+" with the ID: "+id+" was successfully deleted.", "success");
                return;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });
        };

        /*
         * Function that loads the reource's native response from the API server and presents in the view
         */
        $scope.loadResource = function(resource, id){
            $http.get('/'+resource+"/"+id).success(function(data){
                $scope.details = data;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
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

        /*
         *  Upon initializing the form check whether it is in edit mode or create mode and add data accordingly
         */
        var resource = $routeParams.resource;
        if ($routeParams.action === 'edit'){
            $scope.editMode = true;
            if ( angular.isUndefined($routeParams.id) ){
                AlertMsg.addMsg( "The resource id is empty! Make sure you selected a resource before clicking Edit", "danger" );
                return;
            }
            var id = $routeParams.id;
            $http.get( "/" + resource + "/" + id).success( function(data){
                $scope.resourceData = data;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });
        }

        /*
         *  If the resource is a node add the list of ids for cluster and provider as a dropdown
         */
        if( resource === 'nodes' ){
            $scope.clusters = [];
            $scope.providers = [];
            $scope.oxauth_nodes = [];
            $scope.oxtrust_nodes = [];

            // Initialize deafult for <select> to avoid empty angular item
            $scope.resourceData.type = '';
            $scope.resourceData.oxtrust_node_id = '';
            $scope.resourceData.oxauth_node_id = '';

            $http.get("/clusters").success(function(data){
                angular.forEach(data, function(item){
                    $scope.clusters.push({'id' : item.id, 'name': item.name});
                });
                $scope.resourceData.cluster_id = data.length > 0 ? data[0].id : '';
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });

            $http.get("/providers").success(function(data){
                angular.forEach(data, function(item){
                    $scope.providers.push({'id' : item.id, 'name': item.hostname});
                });
                $scope.resourceData.provider_id = data.length > 0 ? data[0].id : '';
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });

            $http.get("/nodes").success(function(data){
                angular.forEach(data, function(item){
                    if( item.type === 'oxtrust' ){
                        $scope.oxtrust_nodes.push({'id': item.id, 'name': item.name});
                    } else if( item.type === 'oxauth' ){
                        $scope.oxauth_nodes.push({'id': item.id, 'name': item.name});
                    }
                });
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });
        }

        /*
         *  Funtion that handles the New Resource and Edit Resource form submissions
         *  This fucntion is called whent the 'Add Resource' button is clicked in the form
         *
         */
        $scope.submit = function(){
            var data = $scope.resourceData;

            if( $scope.editMode ){
                $http.post("/" + resource + "/" + data.id, data).success(function(data, status){
                    // redirect to the overview page with a message that things have been updated
                    $location.path('/'+resource);
                }).error(function(data){
                    postErrorAlert(AlertMsg, data);
                });
            } else {  // Not in Edit Mode == New Resource
                $http.post("/" + resource, data).success(function( data, status){
                    if( resource === 'nodes' ){
                        // redirect to node deploy log page
                        $location.path('/node/log/'+data.name);
                    } else {
                        // redirect to the overview page with a message that new cluster was created
                        $location.path('/'+resource);
                    }
                }).error(function( data ){
                    postErrorAlert(AlertMsg, data);
                });
            }
        };
}]);

// controller for the Dashboard page
webuiControllers.controller( 'DashboardController', ['$scope', '$http', '$routeParams', 'AlertMsg',
    function($scope, $http, $routeParams, AlertMsg){
        AlertMsg.clear();
        $http.get('/dashboard').success(function(data){
            $scope.data = data;
        }).error(function(data){
            postErrorAlert(AlertMsg, data);
        });
}]);


// controller for the Node Log loader page
webuiControllers.controller( 'NodeLogController', ['$scope', '$http', '$routeParams', 'AlertMsg', '$interval',
    function($scope, $http, $routeParams, AlertMsg, $interval){

        // Initialization code
        var stop;
        AlertMsg.clear();

        $scope.node_name = $routeParams.node_name;

        $http.get('/nodes/'+$routeParams.node_name).success(function(data){
            if (angular.isDefined(data.state)) {
                $scope.node_state = data.state;
                if (data.state === 'IN_PROGRESS'){
                    // update the status every 3 seconds
                    stop = $interval($scope.loadLog, 3000);
                } else {
                    $scope.loadLog();
                }
            }
        }).error(function(data){
            postErrorAlert(AlertMsg, data);
        });

        $scope.loadLog = function(){
            $http.get('/node/log/'+$routeParams.node_name).success(function(data){
                $scope.logText = data;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
                $scope.stopLog();
            });

            $http.get('/nodes/'+$routeParams.node_name).success(function(data){
                $scope.node_state = data.state;
                if(data.state !== 'IN_PROGRESS') {
                    $scope.stopLog();
                }
            });
        };

        $scope.stopLog = function(){
            if(angular.isDefined(stop)){
                $interval.cancel(stop);
                stop = undefined;
            }
        };

        $scope.$on('$destroy', function() {
            // Make sure that the interval is destroyed too
            $scope.stopLog();
        });
}]);
