var webuiControllers = angular.module('webuiControllers', ['ui.bootstrap']);

webuiControllers.service('AlertMsg', ['$rootScope', function( $rootScope ){
    var service = {
        alerts : [],
        addMsg: function( message, type ){
            if( typeof message !== 'string' || typeof type !== 'string' ){
                console.error('Invalid params passed. Requires (message<string>, type<string>). You passed (message<'+
                        typeof message+'>, type<'+typeof type+'>).' );
                return false;
            }
            var item = { msg: message, type: type };
            var index = service.alerts.push( item ) - 1;
            $rootScope.$broadcast( 'alerts.update' );
            return index;
        },
        removeMsg: function( index ){
            if( typeof index !== 'number' ){
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
            if( typeof index === 'number' ){
                AlertMsg.removeMsg(index);
            } else {
                console.error('Function closeAlert(index) accepts only numbers. You passed ' + typeof index);
            }
        };
}]);

function postErrorAlert( Alert, data ){
    try{
        if( typeof data.message == 'string' ){
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

        // get the overview table and update the headers and rows
        $http.get('/'+resource).success( function( data ){
            if( !data.length ){
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
            for( var i=0; i < list.length; i++ ){
                if( list[i].id === id ){
                    // providers donot have name -- they have hostname
                    if('hostname' in list[i]){
                        return list[i].hostname;
                    }
                    return list[i].name;
                }
            }
            return id;
        };


        /*
         * Fucntion to delete a resource. This is called whenever a delete button is clicked in the overview UI
         */
        $scope.deleteResource = function(resource, id){
            $http.delete("/"+resource+"/"+id).success(function(data){
                // remove the resource from the view
                var contents = $scope.contents;
                for(var i=0; i < contents.length; i++){
                    if( contents[i].id == id ){
                        contents.splice(i,1);
                        $scope.contents = contents;
                        if( typeof $scope.details !== 'undefined'){
                            if( $scope.details.id === id )
                                $scope.details = undefined;
                        }
                        break;
                    }
                }
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
            if ( typeof $routeParams.id == 'undefined' ){
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
                for (var i=0; i < data.length; i++ ){
                    $scope.clusters.push({'id' : data[i].id, 'name': data[i].name});
                }
                $scope.resourceData.cluster_id = data[0].id;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });

            $http.get("/providers").success(function(data){
                for( var i=0; i < data.length; i++ ){
                    $scope.providers.push({'id' : data[i].id, 'name': data[i].hostname});
                }
                $scope.resourceData.provider_id = data[0].id;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });

            $http.get("/nodes").success(function(data){
                for(var i=0; i < data.length; i++){
                    if( data[i].type === 'oxtrust' ){
                        $scope.oxtrust_nodes.push({'id': data[i].id, 'name': data[i].name});
                    } else if( data[i].type === 'oxauth' ){
                        $scope.oxauth_nodes.push({'id': data[i].id, 'name': data[i].name});
                    }
                }
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });
        }

        /*
         *  If the resource is a provider load the licenses
         */
        if( resource === 'providers' ){
            $scope.license = {};
            // deafults for dropdown
            $scope.resourceData.license_id = '';

            $http.get('/licenses').success(function(data){
                if(!data.length){
                    $scope.license = null;
                } else {
                    var lic = data[0]; // NOTE: hardcoding first license value as currently only one license is allowed
                    $scope.license.id = lic.id;
                    $scope.license.name = lic.metadata.license_name;
                }
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
                $scope.license = null;
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
                    // redirect to the overview page with a message that new cluster was created
                    $location.path('/'+resource);
                }).error(function( data ){
                    postErrorAlert(AlertMsg, data);
                });
            }
        };
}]);
