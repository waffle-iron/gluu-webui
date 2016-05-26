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

        var resources = ['clusters', 'providers', 'nodes', 'license_keys', 'containers'];
        if(resources.indexOf(resource) === -1){
            // if it doesnot match it means some random url has been typed out
            // prevent the default http request
            return false;
        }

        // get the overview table and update the headers and rows
        $http.get('/'+resource).success( function( data ){
            if( data.length === 0 ){
                AlertMsg.addMsg( "There are no " + $scope.currentResource +" available in the Gluu Cluster. Create a new one.", "warning" );
                return;
            }
            $scope.contents = data;

            // For nodes fetch their logs too
            if ( resource === 'containers' ){
                angular.forEach($scope.contents, function(item, index){
                    $scope.contents[index].hasSetupLog = false;
                    $scope.contents[index].hasTeardownLog = false;

                    $http.get('/container_logs/'+item.name).success( function( data ){
                        $scope.contents[index].hasSetupLog = data.setup_log_url;
                        $scope.contents[index].hasTeardownLog = data.teardown_log_url;
                    });
                });
            }
        }).error(function(data){
            postErrorAlert(AlertMsg, data);
        });

        /*
         * If it is containers, fetch the list of clusters and nodes for listing against each container
         */
        if( resource === 'containers' ){
            $http.get('/clusters').success( function(data){
                $scope.clusters = data;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });

            $http.get('/nodes').success( function(data){
                $scope.nodes = data;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });
        }

        /*
         * If it is nodes, fetch the providers
         */
        if( resource === 'nodes' ){
            $http.get('/providers').success(function(data){
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
            var querystring = '';
            // check if the resrouce is a container in progress, then force delete the container
            if ( resource === 'containers' ) {
                for (var i=0; i < $scope.contents.length; i++){
                    if ($scope.contents[i].name === id && $scope.contents[i].state === 'IN_PROGRESS') {
                        querystring = '?force_rm=1';
                    }
                }
            }

            // confirm before initiating deletion
            if (!window.confirm('Are you sure you want to delete the resource?\nThis action cannot be undone.')){
                return;
            }

            // show the gif on that button
            angular.forEach($scope.contents, function(item, index){
                if(item.id === id || (resource === 'nodes' && item.name === id)){
                    $scope.contents[index].deletionStarted = true;
                }
            });

            $http.delete("/"+resource+"/"+id+querystring).success(function(data){
                // remove the resource from the view
                angular.forEach($scope.contents, function(item, index){
                    // remove the deleted resource from the view.
                    if( item.id === id  || (resource === 'nodes' && item.name === id)){
                        $scope.contents.splice(index, 1);
                        return;
                    }
                });
                // also remove the details view if present for the same id
                if( angular.isDefined($scope.details) ){
                    // nodes mightnot have ids, instead use their names
                    if( (resource === 'nodes' && $scope.details.name == id) || $scope.details.id === id ) {
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
webuiControllers.controller( 'ResourceController', ['$scope', '$http', '$routeParams', 'AlertMsg', '$location', '$modal',
    function($scope, $http, $routeParams, AlertMsg, $location, $modal){
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
            $scope.providers = [];

            // Initialize deafult for <select> to avoid empty angular item
            $scope.node_type = '';
            $scope.resourceData.provider_id = '';

            $http.get("/providers").success(function(data){
                $scope.providers = data;
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
            });

        }

        /*
         * If it is a container, fetch the list of available nodes
         */
        if( resource === 'containers'){
            $http.get('/nodes').success(function(data){
                $scope.nodes = data;
            });
        }

        /*
         *  Funtion that handles the New Resource and Edit Resource form submissions
         *  This fucntion is called whent the 'Add Resource' button is clicked in the form
         *
         */
        $scope.submit = function(){
            /* Create a loading.. modal before processing */
            var modal = $modal.open({
                animation: false,
                template:'<div class="modal-body"><p class="text-center"><img src="/static/img/ajax-loader.gif" alt="">  Processing ....</p></div>',
                keyboard: false,
                backdrop: 'static',
                size: 'sm'
            });

            var data = $scope.resourceData;
            var url = '';

            if( $scope.editMode ){
                url = "/" + resource + "/" + data.id;
                $http.put(url, data).success(function(data, status){
                    modal.dismiss();
                    // redirect to the overview page with a message that things have been updated
                    $location.path('/'+resource);
                }).error(function(data){
                    modal.dismiss();
                    postErrorAlert(AlertMsg, data);
                });
            } else {
                if (resource === 'providers') {
                    // here the $routeParams.id carries the provider type; ugly override, should be fixed
                    url = "/providers/" + $routeParams.id;
                } else if (resource === 'containers'){
                    url = "/containers/" + $scope.container_type;
                } else if (resource === 'nodes'){
                    url = "/nodes/" + $scope.node_type;
                } else {
                    url = "/" + resource;
                }
                $http.post(url, data).success(function( data, status){
                    modal.dismiss();
                    if( resource === 'containers' ){
                        // redirect to node deploy log page
                        $location.path('/container_logs/'+data.name+'/setup');
                    } else {
                        // redirect to the overview page with a message that new cluster was created
                        $location.path('/'+resource);
                    }
                }).error(function( data ){
                    postErrorAlert(AlertMsg, data);
                    modal.dismiss();
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
webuiControllers.controller( 'ContainerLogController', ['$scope', '$http', '$routeParams', 'AlertMsg', '$interval',
    function($scope, $http, $routeParams, AlertMsg, $interval){

        // Initialization code
        var stop;
        AlertMsg.clear();


        $http.get('/container_logs/'+$routeParams.id).success(function(data){
            if ( angular.isDefined(data.state) ) {
                $scope.container_name = data.container_name;
                $scope.container_state = data.state;
                if ( ($routeParams.action === 'setup' && data.state === 'SETUP_IN_PROGRESS') ||
                     ($routeParams.action === 'teardown' && data.state === 'TEARDOWN_IN_PROGRESS') ){
                    // update the status every 3 seconds
                    stop = $interval($scope.loadLog, 3000);
                } else {
                    $scope.loadLog();
                }
            } else {
                AlertMsg.addMsg('The state of the Node is not known. Cannot load logs.', 'warning');
            }
        }).error(function(data){
            postErrorAlert(AlertMsg, data);
        });

        $scope.loadLog = function(){
            $http.get('/container_logs/'+$routeParams.id+'/'+$routeParams.action).success(function(data){
                if ($routeParams.action === 'setup'){
                    $scope.logText = data.setup_log_contents.join('\n');
                } else if ($routeParams.action === 'teardown'){
                    $scope.logText = data.teardown_log_contents.join('\n');
                }
                document.getElementById('bottom').scrollIntoView();

                // stop the $interval if the state has shifted to finished
                if (($routeParams.action === 'setup' && data.state === 'SETUP_FINISHED') ||
                    ($routeParams.action === 'teardown' && data.state === 'TEARDOWN_FINISHED')) {
                    $scope.stopLog();
                }
            }).error(function(data){
                postErrorAlert(AlertMsg, data);
                $scope.stopLog();
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
