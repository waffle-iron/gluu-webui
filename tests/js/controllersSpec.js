describe('Controllers', function(){

    var $httpBackend, $rootScope, createController, AlertMsg, $routeParams, $location;
    var $interval;
    beforeEach(module('webuiControllers'));

    // Inject the stuff required
    beforeEach(inject(function($injector){
        // mock all the http requests
        $httpBackend = $injector.get('$httpBackend');
        $rootScope = $injector.get('$rootScope');
        AlertMsg = $injector.get('AlertMsg');
        $location = $injector.get('$location');
        $routeParams = {resource: 'providers', id: 'some-id'};
        $interval = jasmine.createSpy( '$interval', $injector.get('$interval') ).and.callThrough();
        var $controller = $injector.get('$controller');
        createController = function( name ){
            var deps = {'$scope': $rootScope, 'AlertMsg': AlertMsg, '$routeParams': $routeParams};
            switch (name) {
                case 'ResourceController': deps.$location = $location;
                                           break;
                case 'NodeLogController': deps.$interval = $interval;
                                          break;
            }
            return $controller(name, deps);
        };

    }));

    afterEach(function() {
         $httpBackend.verifyNoOutstandingExpectation();
         $httpBackend.verifyNoOutstandingRequest();
    });

    describe('OverviewController', function(){
        describe('intialization of controller', function(){
            it('should get the resource name from routeParams and load overview data', function(){
                var resources = [{id: 'some-id', hostname: 'testhost', type: 'master'}];
                $httpBackend.expectGET('/providers').respond(200, resources);
                var contoller = createController('OverviewController');
                $httpBackend.flush();

                expect($rootScope.currentResource).toEqual('Providers');
                expect($rootScope.currentResURI).toEqual('providers');
                expect($rootScope.contents).toEqual(resources);
            });

            it('should add an alert if there are no resources in response', function(){
                expect(AlertMsg.alerts.length).toEqual(0);
                $httpBackend.expectGET('/providers').respond(200, []);
                var controller = createController('OverviewController');
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
            });

            it('should add an alert if resource req returns non-200 resp', function(){
                expect(AlertMsg.alerts.length).toEqual(0);
                $httpBackend.expectGET('/providers').respond(400, {message: 'nodata'});
                var controller = createController('OverviewController');
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
            });

            it('should not request data if resource is invalid', function(){
                $routeParams.resource = 'clusters'; // maybe this assertion needs to be done for every valid resource
                $httpBackend.expectGET('/clusters').respond(200, []);
                var controller = createController('OverviewController');
                $httpBackend.flush();

                $routeParams.resource = 'random string';
                controller = createController('OverviewController');
                // TODO improve this test. this passes but lacks any sort of assertion
            });
        });

        describe('$scope.loadResource', function(){
            // setup the intial values
            beforeEach(function(){
                $httpBackend.when('GET', '/providers').respond([{id: 'some-id'}]);
                var controller = createController('OverviewController');
            });
            it('should assign data to $scope.details upon success', function() {
                $httpBackend.expectGET('/providers/some-id').respond(200, {id: 'some-id'});
                $rootScope.loadResource('providers', 'some-id');

                $httpBackend.flush();
                expect($rootScope.details).toEqual({id: 'some-id'});
            });

            it('should add an alert when upon error', function(){
                expect(AlertMsg.alerts.length).toEqual(0);
                $httpBackend.expectGET('/providers/some-id').respond(400, {message: 'error'});
                $rootScope.loadResource('providers', 'some-id');
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
            });
        });


        describe('$scope.deleteResource', function(){
            beforeEach(function(){
                var resources = [{id: 'test-id1'}, {id: 'test-id2'}, {id: 'test-id3'}];
                $httpBackend.when('GET', '/providers').respond(200, resources);
                var controller = createController('OverviewController');
                $httpBackend.flush();
            });

            it('should show an alert and return if the node state is IN_PROGRESS', function(){
                spyOn(window, 'alert');
                $rootScope.contents = [{name: 'node1', state: 'IN_PROGRESS'}];
                $rootScope.deleteResource( 'nodes', 'node1' );
                expect(window.alert).toHaveBeenCalled();
            });

            it('should not initiate delete action if confirmation is cancelled', function(){
                spyOn(window, 'confirm').and.returnValue(false);
                expect($rootScope.contents.length).toEqual(3);
                $rootScope.deleteResource( 'providers', 'test-id1');
                expect(window.confirm).toHaveBeenCalled();
                expect($rootScope.contents.length).toEqual(3);
            });


            describe('when the user confirms deletion', function(){
                beforeEach(function(){
                    spyOn(window, 'confirm').and.returnValue(true);
                });
                it('should set deletionStarted property if id matches', function(){
                    expect($rootScope.contents[0].deletionStarted).toBe(undefined);
                    $httpBackend.expectDELETE('/providers/test-id1').respond(200, {});
                    $httpBackend.expectDELETE('/providers/test-id3').respond(200, {});
                    $rootScope.deleteResource( 'providers', 'test-id1');
                    $rootScope.deleteResource( 'providers', 'test-id3');

                    expect($rootScope.contents[0].deletionStarted).toBe(true);
                    expect($rootScope.contents[1].deletionStarted).toBe(undefined);
                    expect($rootScope.contents[2].deletionStarted).toBe(true);
                    $httpBackend.flush();
                });

                it('should remove the resource from contents upon request success', function(){
                    expect($rootScope.contents.length).toEqual(3);
                    $httpBackend.expectDELETE('/providers/test-id1').respond(200, {});
                    $rootScope.deleteResource( 'providers', 'test-id1');
                    $httpBackend.flush();
                    expect($rootScope.contents.length).toEqual(2);
                    // twice
                    $httpBackend.expectDELETE('/providers/test-id3').respond(200, {});
                    $rootScope.deleteResource('providers', 'test-id3');
                    $httpBackend.flush();
                    expect($rootScope.contents.length).toEqual(1);
                });

                it('should add an alert if the delete action is a failure', function(){
                    expect(AlertMsg.alerts.length).toEqual(0);
                    $httpBackend.expectDELETE('/providers/test-id4').respond(400, {message: 'not removed'});
                    $rootScope.deleteResource('providers', 'test-id4');
                    expect($rootScope.contents.length).toEqual(3);
                    $httpBackend.flush();
                    expect($rootScope.contents.length).toEqual(3);
                    expect(AlertMsg.alerts.length).toEqual(1);
                });

                it('should remove the details if the id mataches', function(){
                    $httpBackend.expectDELETE('/providers/test-id1').respond(200, 'OK');
                    $rootScope.details = {id: 'test-id1'};
                    expect($rootScope.details).toEqual({id: 'test-id1'});
                    $rootScope.deleteResource('providers', 'test-id1');
                    $httpBackend.flush();
                    expect($rootScope.details).toBe(undefined);
                });

                it('should remove the details if the id is empty using the name for NODES', function(){
                    $httpBackend.expectDELETE('/nodes/test-id1').respond(200, 'OK');
                    $rootScope.details = {id: '', name: 'test-id1'};
                    $rootScope.deleteResource('nodes', 'test-id1');
                    $httpBackend.flush();
                    expect($rootScope.details).toBe(undefined);
                });

                it('should NOT remove the details if the id doesnt match', function(){
                    $httpBackend.expectDELETE('/providers/test-id3').respond(200, 'OK');
                    $rootScope.details = {id: 'test-id1'};
                    expect($rootScope.details).toEqual({id: 'test-id1'});
                    $rootScope.deleteResource('providers', 'test-id3');
                    $httpBackend.flush();
                    expect($rootScope.details).not.toBe(undefined);
                });
            });

        });

        describe('$scope.getResourceName', function(){
            beforeEach(function(){
                $httpBackend.when('GET', '/providers').respond(200, []);
                var controller = createController('OverviewController');
                $httpBackend.flush();
            });

            it('should return cluster name for cluster id', function(){
                var list = [{id: 'id1', name: 'cluster1'}, {id: 'id2', name: 'cluster2'}];
                expect($rootScope.getResourceName(list, 'id1')).toMatch('cluster1');
                expect($rootScope.getResourceName(list, 'id2')).toMatch('cluster2');
            });

            it('should return provider hostname for provider id', function(){
                var list = [{id: 'id1', hostname: 'provider1'}, {id: 'id2', hostname: 'provider2'}];
                expect($rootScope.getResourceName(list, 'id1')).toMatch('provider1');
                expect($rootScope.getResourceName(list, 'id2')).toMatch('provider2');
            });

            it('should return the id if the id doesn\'t match anything', function(){
                var list = [{id: 'id1', hostname: 'provider2'}, {id: 'id2', hostname: 'provider2'}];
                expect($rootScope.getResourceName(list, 'id3')).toMatch('id3');
                expect($rootScope.getResourceName(list, 'random-id')).toMatch('random-id');

                list = [{id: 'id1', name: 'cluster1'}, {id: 'id2', name: 'cluster2'}];
                expect($rootScope.getResourceName(list, 'id3')).toMatch('id3');
                expect($rootScope.getResourceName(list, 'random-id')).toMatch('random-id');
            });
        });

        describe('when resource is NODE', function(){
            beforeEach(function(){
                $routeParams = {resource: 'nodes'};
            });
            it('should load list of clusters and providers to the scope', function(){
                $httpBackend.expectGET('/nodes').respond(200, []);
                $httpBackend.expectGET('/clusters').respond(200, []);
                $httpBackend.expectGET('/providers').respond(200, []);

                var controller = createController('OverviewController');
                $httpBackend.flush();

                expect($rootScope.providers).toEqual([]);
                expect($rootScope.clusters).toEqual([]);
            });

            it('should post an alert if it can\'t fetch data', function(){
                $httpBackend.expectGET('/nodes').respond(200, [{id: 'someid'}]);
                $httpBackend.expectGET('/clusters').respond(400, {message: 'NOT OK'});
                $httpBackend.expectGET('/providers').respond(400, {message: 'NOT OK'});

                expect(AlertMsg.alerts.length).toEqual(0);
                var controller = createController('OverviewController');
                $httpBackend.flush();

                expect($rootScope.providers).toBe(undefined);
                expect($rootScope.clusters).toBe(undefined);
                expect(AlertMsg.alerts.length).toEqual(2);
            });

        });
    });

    describe('ResourceController', function(){
        describe('intialization code', function(){
            it('should set edit mode to false if action=new', function(){
                $routeParams = {resource: 'resource', action: 'new'};
                var controller = createController('ResourceController');
                expect($rootScope.editMode).toEqual(false);
                expect($routeParams.action).toEqual('new');
            });

            it('should set edit mode to true if action=edit', function(){
                $routeParams = {resource: 'resource', action: 'edit'};
                var controller = createController('ResourceController');
                expect($rootScope.editMode).toEqual(true);
                expect($routeParams.action).toEqual('edit');
            });

            it('should get resourceData using id in editmode', function(){
                $routeParams = {resource: 'resource', action: 'edit', id: 'some-id'};
                var data = {id: 'some-id', data: 'some-data'};
                $httpBackend.expectGET('/resource/some-id').respond(200, data);
                var controller = createController('ResourceController');
                expect($rootScope.resourceData).toEqual({});
                $httpBackend.flush();
                expect($rootScope.resourceData).toEqual(data);
            });

            it('should post an alert if it cant get data in edit mode', function(){
                expect(AlertMsg.alerts.length).toEqual(0);
                $routeParams = {resource: 'resource', action: 'edit', id: 'some-id'};
                $httpBackend.expectGET('/resource/some-id').respond(400, {message: 'no data'});
                var controller = createController('ResourceController');
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
                expect($rootScope.resourceData).toEqual({});
            });

            it('should add an alert when ID is not supplied for editing', function(){
                expect(AlertMsg.alerts.length).toEqual(0);
                $routeParams = {resource: 'resource', action: 'edit'};
                var controller = createController('ResourceController');
                expect(AlertMsg.alerts.length).toEqual(1);
                expect($rootScope.resourceData).toEqual({});
            });

            /*
             *  Tests to verfiy NEW NODE form specific actions
             */
            describe('when resource is NODE', function(){
                it('should get the list of clusters and providers for Node form', function(){
                    $routeParams = {resource: 'nodes'};
                    $httpBackend.expectGET('/clusters').respond(200, [{id: 'id1', name: 'cluster1'}]);
                    $httpBackend.expectGET('/providers').respond(200, [{id: 'id2', hostname: 'provider1'}]);
                    var controller = createController('ResourceController');
                    $httpBackend.flush();
                    expect($rootScope.clusters.length).toEqual(1);
                    expect($rootScope.providers.length).toEqual(1);
                });

                it('should post alerts when dependency fetching fails for New Node', function(){
                    $routeParams = {resource: 'nodes'};
                    $httpBackend.expectGET('/clusters').respond(400, {message: 'NOT OK'});
                    $httpBackend.expectGET('/providers').respond(400, {message: 'NOT OK'});
                    expect(AlertMsg.alerts.length).toEqual(0);
                    var controller = createController('ResourceController');
                    $httpBackend.flush();
                    expect(AlertMsg.alerts.length).toEqual(2);
                });
            });

        });

        describe('$scope.submit', function(){
            beforeEach(function(){
                $routeParams = {resource: 'resource'};
                var controller = createController('ResourceController');
                $rootScope.resourceData = {id: 'some-id', name: 'some name'};
            });

            it('should post data to /resource/id in edit mode', function(){
                $httpBackend.expectPOST('/resource/some-id', {id: 'some-id', name: 'some name'}).respond(200, 'OK');
                $rootScope.editMode = true;
                $rootScope.submit();
                $httpBackend.flush();
            });
            it('should post data to /resource in new mode', function(){
                $httpBackend.expectPOST('/resource', {id: 'some-id', name: 'some name'}).respond(200, 'OK');
                $rootScope.editMode = false;
                $rootScope.submit();
                $httpBackend.flush();
            });
            it('should redirect to /resource upon post success', function(){
                $httpBackend.expectPOST('/resource', {id: 'some-id', name: 'some name'}).respond(200, 'OK');
                $rootScope.submit();
                $httpBackend.flush();
                expect($location.path()).toEqual('/resource');
            });
            it('should redirect to /node/log/node_name upon successful POST for Nodes', function(){
                $routeParams = {resource: 'nodes'};
                var controller = createController('ResourceController');
                $rootScope.resourceData = {};
                $httpBackend.expectGET('/clusters').respond(200, []);
                $httpBackend.expectGET('/providers').respond(200, []);
                $httpBackend.expectPOST('/nodes', {}).respond(200, {name: 'node_name'});
                $rootScope.submit();
                $httpBackend.flush();
                expect($location.path()).toEqual('/node/log/node_name');
            });
            it('should add an alert on POST failure in both Edit and Create', function(){
                $httpBackend.expectPOST('/resource', {id: 'some-id', name: 'some name'}).respond(400, {message: 'not accepted'});
                expect(AlertMsg.alerts.length).toEqual(0);
                // Create Mode
                $rootScope.editMode = false;
                $rootScope.submit();
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
                // Edit Mode
                $httpBackend.expectPOST('/resource/some-id', {id: 'some-id', name: 'some name'}).respond(400, {message: 'not accepted'});
                $rootScope.editMode = true;
                $rootScope.submit();
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(2);
            });
        });
    });

    describe('function postErrorAlert', function(){
        it('should add the message to the AlertMsg', function(){
            var msg = {message: 'message'};
            expect(AlertMsg.alerts.length).toEqual(0);
            postErrorAlert(AlertMsg, msg);
            expect(AlertMsg.alerts.length).toEqual(1);
            postErrorAlert(AlertMsg, msg);
            expect(AlertMsg.alerts.length).toEqual(2);
            postErrorAlert(AlertMsg, msg);
            expect(AlertMsg.alerts.length).toEqual(3);
        });

        it('should add an alert when there is no data sent to it', function(){
            expect(AlertMsg.alerts.length).toEqual(0);
            postErrorAlert(AlertMsg);
            expect(AlertMsg.alerts.length).toEqual(1);
            postErrorAlert(AlertMsg);
            expect(AlertMsg.alerts.length).toEqual(2);
        });

        it('should log an error to console when the data is invalid', function(){
            spyOn(console, 'log');
            expect(AlertMsg.alerts.length).toEqual(0);
            postErrorAlert(AlertMsg, 23);
            expect(console.log).toHaveBeenCalled();
            expect(AlertMsg.alerts.length).toEqual(1);
            postErrorAlert(AlertMsg, {});
            expect(AlertMsg.alerts.length).toEqual(2);
            expect(console.log).toHaveBeenCalled();
        });
    });

    describe('AlertController', function(){
        it('should load all alerts of AlertMsg to scope', function(){
            postErrorAlert(AlertMsg, {message: 'some message'});
            var controller = createController('AlertController');
            expect( $rootScope.alerts ).toEqual( AlertMsg.alerts );
        });

        it('should update the scope.alerts whenever AlertMsg changes', function(){
            postErrorAlert(AlertMsg, {message: 'some message'});
            var controller = createController('AlertController');
            expect( $rootScope.alerts ).toEqual( AlertMsg.alerts );
            postErrorAlert(AlertMsg, {message: 'more message'});
            expect( $rootScope.alerts ).toEqual( AlertMsg.alerts );
            postErrorAlert(AlertMsg, {message: 'final message'});
            expect( $rootScope.alerts ).toEqual( AlertMsg.alerts );
        });

        describe('$scope.closeAlert', function(){
            beforeEach(function(){
                postErrorAlert(AlertMsg, {message: 'some message'});
                postErrorAlert(AlertMsg, {message: 'more message'});
                postErrorAlert(AlertMsg, {message: 'final message'});
                var controller = createController('AlertController');
            });
            it('should remove the alert in the given index', function(){
                expect(AlertMsg.alerts.length).toEqual(3);
                $rootScope.closeAlert(2);
                expect(AlertMsg.alerts.length).toEqual(2);
                $rootScope.closeAlert(0);
                expect(AlertMsg.alerts.length).toEqual(1);
            });

            it('should not remove anything if index is invalid', function(){
                expect(AlertMsg.alerts.length).toEqual(3);

                spyOn(console, 'error');
                $rootScope.closeAlert(10);
                expect(AlertMsg.alerts.length).toEqual(3);
                expect(console.error).toHaveBeenCalled();

                $rootScope.closeAlert('myname');
                expect(AlertMsg.alerts.length).toEqual(3);
                expect(console.error).toHaveBeenCalled();
            });

            it('should log an error if the index is not a number', function(){
                spyOn(console, 'error');
                $rootScope.closeAlert('myname');
                expect(AlertMsg.alerts.length).toEqual(3);
                expect(console.error).toHaveBeenCalled();

                $rootScope.closeAlert([]);
                expect(AlertMsg.alerts.length).toEqual(3);
                expect(console.error).toHaveBeenCalled();
            });
        });
    });

    describe('AlertMsg Service', function(){
        beforeEach(function(){
                AlertMsg.alerts = [];
        });
        describe('function addMsg', function(){
            it('should add message,type if they are strings', function(){
                expect(AlertMsg.alerts.length).toEqual(0);
                AlertMsg.addMsg('message', 'type');
                expect(AlertMsg.alerts.length).toEqual(1);
            });

            it('should not add but log an error if the message, type is not a string', function(){
                spyOn(console, 'error');
                expect(AlertMsg.alerts.length).toEqual(0);

                // undefined type
                AlertMsg.addMsg('message');
                expect(AlertMsg.alerts.length).toEqual(0);
                expect(console.error).toHaveBeenCalled();

                // improper type
                AlertMsg.addMsg('message', {});
                expect(AlertMsg.alerts.length).toEqual(0);
                expect(console.error).toHaveBeenCalled();

                // undefined message
                AlertMsg.addMsg(undefined, 'type');
                expect(AlertMsg.alerts.length).toEqual(0);
                expect(console.error).toHaveBeenCalled();

                // improper message
                AlertMsg.addMsg([], 'type');
                expect(AlertMsg.alerts.length).toEqual(0);
                expect(console.error).toHaveBeenCalled();
            });
        });

        describe('function removeMsg', function(){
            beforeEach(function(){
                AlertMsg.addMsg('message1', 'type1');
                AlertMsg.addMsg('message2', 'type2');
                AlertMsg.addMsg('message3', 'type3');
            });
            it('should remove the message from alerts if index is valid', function(){
                expect(AlertMsg.alerts.length).toEqual(3);
                AlertMsg.removeMsg(2);
                expect(AlertMsg.alerts.length).toEqual(2);
                AlertMsg.removeMsg(0);
                expect(AlertMsg.alerts.length).toEqual(1);
            });

            it('should not remove but log an error if index is invalid', function(){
                spyOn(console, 'error');
                expect(AlertMsg.alerts.length).toEqual(3);

                AlertMsg.removeMsg(8);
                expect(console.error).toHaveBeenCalled();
                expect(AlertMsg.alerts.length).toEqual(3);

                AlertMsg.removeMsg("random thing");
                expect(console.error).toHaveBeenCalled();
                expect(AlertMsg.alerts.length).toEqual(3);
            });
        });

        describe('function clear', function(){
            it('should empty the alerts when called', function(){
                expect(AlertMsg.alerts.length).toEqual(0);
                AlertMsg.addMsg('message1', 'type1');
                AlertMsg.addMsg('message2', 'type2');
                expect(AlertMsg.alerts.length).toEqual(2);
                AlertMsg.clear();
                expect(AlertMsg.alerts.length).toEqual(0);
            });
        });
    });

    describe('Dashboard Controller', function(){
        it('should get dashboard data from the server and load', function(){
            var data = {nodes: 0, clusters: 2, providers: 1};
            $httpBackend.expectGET('/dashboard').respond(200, data);

            var controller = createController('DashboardController');
            $httpBackend.flush();
            expect($rootScope.data).toEqual(data);
        });

        it('should post an alert if it did not get any alert', function(){
            $httpBackend.expectGET('/dashboard').respond(400, {message: 'NOTHING'});
            expect(AlertMsg.alerts.length).toEqual(0);

            var controller = createController('DashboardController');
            $httpBackend.flush();
            expect(AlertMsg.alerts.length).toEqual(1);
        });
    });

    describe('NodeLogController', function(){
        beforeEach(function(){
            $routeParams = {node_name: 'node1'};
        });
        describe('Initialization', function(){
            it('should setup a timer to GET /node/log at intervals', function(){
                $httpBackend.expectGET('/nodes/node1').respond(200, {state: 'IN_PROGRESS'});
                var controller = createController('NodeLogController');
                $httpBackend.flush();
                expect($interval).toHaveBeenCalled();
            });

            it('should load log without timer when state is not IN_PROGRESS', function(){
                $httpBackend.expectGET('/nodes/node1').respond(200, {state: 'FAILED'});
                var controller = createController('NodeLogController');
                spyOn($rootScope, 'loadLog');
                $httpBackend.flush();
                expect($rootScope.loadLog).toHaveBeenCalled();
            });

            it('should post an alert if the node detail req fails', function(){
                $httpBackend.expectGET('/nodes/node1').respond(404, {message: 'FAILED'});
                var controller = createController('NodeLogController');
                expect(AlertMsg.alerts.length).toEqual(0);
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
            });

            it('should alert the user if the data does not define a state for the node', function(){
                $httpBackend.expectGET('/nodes/node1').respond(200, 'Data without State');
                var controller = createController('NodeLogController');
                expect(AlertMsg.alerts.length).toEqual(0);
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
            });
        });

        describe('$scope.loadLog', function(){
            beforeEach(function(){
                $httpBackend.expectGET('/nodes/node1').respond(200, {state: 'IN_PROGRESS'});
                var controller = createController('NodeLogController');
                $httpBackend.flush();
            });
            it('should load the log data to scope', function(){
                $httpBackend.expectGET('/node/log/node1').respond(200, 'LOG TEXT');
                $httpBackend.expectGET('/nodes/node1').respond(200, {state: 'IN_PROGRESS'});
                $rootScope.loadLog();
                $httpBackend.flush();
                expect($rootScope.logText).toEqual('LOG TEXT');
            });
            it('should add an alert and stop the timer upon GET error', function(){
                spyOn($interval, 'cancel');
                $httpBackend.expectGET('/node/log/node1').respond(404, {message: 'NO DATA'});
                $httpBackend.expectGET('/nodes/node1').respond(200, {state: 'IN_PROGRESS'});
                expect(AlertMsg.alerts.length).toEqual(0);
                $rootScope.loadLog();
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
                expect($interval.cancel).toHaveBeenCalled();
            });

            it('should stop the timer if state is not IN_PROGRESS', function(){
                spyOn($interval, 'cancel');
                $httpBackend.expectGET('/node/log/node1').respond(200, 'LOG DONE');
                $httpBackend.expectGET('/nodes/node1').respond(200, {state: 'SUCCESS'});
                $rootScope.loadLog();
                $httpBackend.flush();
                expect($interval.cancel).toHaveBeenCalled();
            });

            it('should stop the timer when the scope is destroyed', function(){
                spyOn($rootScope, 'stopLog');
                $rootScope.$destroy();
                expect($rootScope.stopLog).toHaveBeenCalled();
            });
        });

        describe('$scope.stopLog', function(){
            beforeEach(function(){
                $httpBackend.expectGET('/nodes/node1').respond(200, {state: 'IN_PROGRESS'});
                var controller = createController('NodeLogController');
                $httpBackend.flush();
            });
            it('should cancel the interval and set stop to undefined if defined', function(){
                spyOn($interval, 'cancel');
                $rootScope.stopLog();
                expect($interval.cancel).toHaveBeenCalled();
            });
        });
    });
});


