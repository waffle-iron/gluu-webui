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
                case 'ContainerLogController': deps.$interval = $interval;
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

                it('should NOT remove the details if the id doesnt match', function(){
                    $httpBackend.expectDELETE('/providers/test-id3').respond(200, 'OK');
                    $rootScope.details = {id: 'test-id1'};
                    expect($rootScope.details).toEqual({id: 'test-id1'});
                    $rootScope.deleteResource('providers', 'test-id3');
                    $httpBackend.flush();
                    expect($rootScope.details).not.toBe(undefined);
                });

                it('should add force_rm=1 to the querystring when deleting a container IN_PROGRESS', function(){
                    $httpBackend.expectDELETE('/containers/container_id?force_rm=1').respond(200, 'OK');
                    $rootScope.contents = [{id: 'container_id', state:'IN_PROGRESS'}];
                    $rootScope.deleteResource('containers', 'container_id');
                    expect($rootScope.contents[0].deletionStarted).toBe(true);
                    $httpBackend.flush();
                });
            });

        });

        describe('$scope.getResourceName', function(){
            beforeEach(function(){
                $httpBackend.when('GET', '/providers').respond(200, []);
                var controller = createController('OverviewController');
                $httpBackend.flush();
            });

            it('should return resource name for given resource id', function(){
                var list = [{id: 'id1', name: 'cluster1'}, {id: 'id2', name: 'resource2'}];
                expect($rootScope.getResourceName(list, 'id1')).toMatch('cluster1');
                expect($rootScope.getResourceName(list, 'id2')).toMatch('resource2');
            });

            it('should return the id if the id doesn\'t match anything', function(){
                var list = [{id: 'id1', name: 'provider2'}, {id: 'id2', name: 'provider2'}];
                expect($rootScope.getResourceName(list, 'id3')).toMatch('id3');
                expect($rootScope.getResourceName(list, 'random-id')).toMatch('random-id');

                list = [{id: 'id1', name: 'cluster1'}, {id: 'id2', name: 'cluster2'}];
                expect($rootScope.getResourceName(list, 'id3')).toMatch('id3');
                expect($rootScope.getResourceName(list, 'random-id')).toMatch('random-id');
            });
        });

        describe('when resource is Containers', function(){
            beforeEach(function(){
                $routeParams = {resource: 'containers'};
            });
            it('should load list of clusters and nodes to the scope', function(){
                $httpBackend.expectGET('/containers').respond(200, []);
                $httpBackend.expectGET('/clusters').respond(200, []);
                $httpBackend.expectGET('/nodes').respond(200, []);

                var controller = createController('OverviewController');
                $httpBackend.flush();

                expect($rootScope.nodes).toEqual([]);
                expect($rootScope.clusters).toEqual([]);
            });

            it('should post an alert if it can\'t fetch data', function(){
                $httpBackend.expectGET('/containers').respond(200, []);
                $httpBackend.expectGET('/clusters').respond(400, {message: 'NOT OK'});
                $httpBackend.expectGET('/nodes').respond(400, {message: 'NOT OK'});

                expect(AlertMsg.alerts.length).toEqual(0);
                var controller = createController('OverviewController');
                $httpBackend.flush();

                expect($rootScope.nodes).toBeUndefined();
                expect($rootScope.clusters).toBeUndefined();
                expect(AlertMsg.alerts.length).toEqual(3); // +1 for empty /containers
            });

            it('should fetch the container_logs for each log and set the status', function(){
                $httpBackend.expectGET('/containers').respond(200, [{id: 'some-id', name: 'some-name'}]);
                $httpBackend.expectGET('/clusters').respond(200, []);
                $httpBackend.expectGET('/nodes').respond(200, []);
                $httpBackend.expectGET('/container_logs/some-name').respond(200, {setup_log_url: 'setup_url', teardown_log_url: 'teardown_url'})

                var controller = createController('OverviewController');
                $httpBackend.flush();

                expect($rootScope.contents[0].hasSetupLog).toBeTruthy();
                expect($rootScope.contents[0].hasTeardownLog).toBeTruthy();
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
                it('should get the list of providers for Node form', function(){
                    $routeParams = {resource: 'nodes'};
                    $httpBackend.expectGET('/providers').respond(200, [{id: 'id2', name: 'provider1'}]);
                    var controller = createController('ResourceController');
                    $httpBackend.flush();
                    expect($rootScope.providers.length).toEqual(1);
                });

                it('should post alerts when dependency fetching fails for New Node', function(){
                    $routeParams = {resource: 'nodes'};
                    $httpBackend.expectGET('/providers').respond(400, {message: 'NOT OK'});
                    expect(AlertMsg.alerts.length).toEqual(0);
                    var controller = createController('ResourceController');
                    $httpBackend.flush();
                    expect(AlertMsg.alerts.length).toEqual(1);
                });
            });

        });

        describe('$scope.submit', function(){
            beforeEach(function(){
            });

            it('should send a PUT request to /resource/id in edit mode', function(){
                $routeParams = {resource: 'resource'};
                var controller = createController('ResourceController');
                $rootScope.resourceData = {id: 'some-id', name: 'some name'};
                $httpBackend.expectPUT('/resource/some-id', {id: 'some-id', name: 'some name'}).respond(200, 'OK');
                $rootScope.editMode = true;
                $rootScope.submit();
                $httpBackend.flush();
            });

            it('should post data to /providers/driver when the resource is provider', function(){
                $routeParams = {resource: 'providers', id: 'digitalocean'};
                var controller = createController('ResourceController');
                $rootScope.resourceData = {id: 'some-id', name: 'some name'};
                $httpBackend.expectPOST('/providers/digitalocean', {id: 'some-id', name: 'some name'}).respond(200, 'OK');
                $rootScope.editMode = false;
                $rootScope.submit();
                $httpBackend.flush();
            });

            it('should post data to /containers/contianer_type when the resource is contianers', function(){
                $routeParams = {resource: 'containers'};
                $httpBackend.expectGET('/nodes').respond(200, []);
                var controller = createController('ResourceController');
                $rootScope.container_type = 'oxidp';
                $rootScope.resourceData = {id: 'id1'};
                $httpBackend.expectPOST('/containers/oxidp', {id: 'id1'}).respond(200, 'OK');
                $rootScope.editMode = false;
                $rootScope.submit();
                $httpBackend.flush();
            });

            it('should post data to /nodes/node_type when the resource is node', function(){
                $routeParams = {resource: 'nodes'};
                $httpBackend.expectGET('/providers').respond(200, []);
                var controller = createController('ResourceController');
                $rootScope.node_type = 'master';
                $rootScope.resourceData = {id: 'id1'};
                $httpBackend.expectPOST('/nodes/master', {id: 'id1'}).respond(200, 'OK');
                $rootScope.editMode = false;
                $rootScope.submit();
                $httpBackend.flush();
            });
            it('should redirect to /resource upon post success', function(){
                $routeParams = {resource: 'resource'};
                $httpBackend.expectPOST('/resource', {}).respond(200, 'OK');
                var controller = createController('ResourceController');
                $rootScope.submit();
                $httpBackend.flush();
                expect($location.path()).toEqual('/resource');
            });
            it('should redirect to /container_logs/container_name/setup upon successful POST for containers', function(){
                $routeParams = {resource: 'containers'};
                $httpBackend.expectGET('/nodes').respond(200, []);
                var controller = createController('ResourceController');
                $rootScope.container_type = 'oxauth';
                $httpBackend.expectPOST('/containers/oxauth', {}).respond(200, {name: 'container_1'});
                $rootScope.submit();
                $httpBackend.flush();
                expect($location.path()).toEqual('/container_logs/container_1/setup');
            });
            it('should add an alert on POST failure in both Edit and Create', function(){
                $routeParams = {resource: 'resource', id: 'some-id'};
                var controller = createController('ResourceController');
                expect(AlertMsg.alerts.length).toEqual(0);
                // Create Mode
                $httpBackend.expectPOST('/resource', {}).respond(400, {message: 'not accepted'});
                $rootScope.editMode = false;
                $rootScope.submit();
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
                // Edit Mode
                $httpBackend.expectPUT('/resource/some-id', {id: 'some-id'}).respond(400, {message: 'not accepted'});
                $rootScope.resourceData = {id: 'some-id'};
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
    });

    describe('ContainerLogController', function(){
        beforeEach(function(){
            $routeParams = {id: 'container-1', action: 'setup'};
        });
        describe('Initialization', function(){
           it('should load log without timer when state is SETUP_FINISHED or TEARDOWN_FINISHED', function(){
                $httpBackend.expectGET('/container_logs/container-1').respond(200, {state: 'SETUP_FINISHED'});
                var controller = createController('ContainerLogController');
                spyOn($rootScope, 'loadLog');
                $httpBackend.flush();
                expect($rootScope.loadLog).toHaveBeenCalled();

                $httpBackend.expectGET('/container_logs/container-1').respond(200, {state: 'TEARDOWN_FINISHED'});
                var controller = createController('ContainerLogController');
                spyOn($rootScope, 'loadLog');
                $httpBackend.flush();
                expect($rootScope.loadLog).toHaveBeenCalled();
            });

            it('should post an alert if container_log fetch req fails', function(){
                $httpBackend.expectGET('/container_logs/container-1').respond(404, {message: 'FAILED'});
                var controller = createController('ContainerLogController');
                expect(AlertMsg.alerts.length).toEqual(0);
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
            });

            it('should alert the user if the data does not define a state for the node', function(){
                $httpBackend.expectGET('/container_logs/container-1').respond(200, 'Data without State');
                var controller = createController('ContainerLogController');
                expect(AlertMsg.alerts.length).toEqual(0);
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
            });

            it('should set an interval to load log if the state is either SETUP_IN_PROGRESS or TEARDOWN_IN_PROGRESS', function(){
                $httpBackend.expectGET('/container_logs/container-1').respond(200, {state: 'SETUP_IN_PROGRESS'});
                var controller = createController('ContainerLogController');
                $httpBackend.flush();
                expect($interval).toHaveBeenCalledWith($rootScope.loadLog, 3000);

                $routeParams = {id: 'container-1', action: 'teardown'};
                $httpBackend.expectGET('/container_logs/container-1').respond(200, {state: 'TEARDOWN_IN_PROGRESS'});
                var controller = createController('ContainerLogController');
                $httpBackend.flush();
                expect($interval).toHaveBeenCalledWith($rootScope.loadLog, 3000);
            });

        });

        describe('$scope.loadLog', function(){
            beforeEach(function(){
                $httpBackend.expectGET('/container_logs/container-1').respond(200, {state: 'SETUP_IN_PROGRESS'});
                var controller = createController('ContainerLogController');
                $httpBackend.flush();

                // fixture to test the scrolling to bottom after log text update
                if (!document.getElementById('bottom')){
                    var bottomEle = document.createElement('div');
                    bottomEle.setAttribute('id', 'bottom');
                    var body = document.getElementsByTagName('body')[0];
                    body.appendChild(bottomEle);
                }
            });

            it('should load the log data to scope', function(){
                $httpBackend.expectGET('/container_logs/container-1/setup').respond(200, {setup_log_contents: ['Line 1', 'Line 2']});
                $rootScope.loadLog();
                $httpBackend.flush();
                expect($rootScope.logText).toEqual('Line 1\nLine 2');
            });

            it('should scroll to the bottom after log text is added', function(){
                $httpBackend.expectGET('/container_logs/container-1/setup').respond(200, {setup_log_contents: ['Line 1', 'Line 2']});
                spyOn(document.getElementById('bottom'), 'scrollIntoView').and.callThrough();
                $rootScope.loadLog();
                $httpBackend.flush();
                expect(document.getElementById('bottom').scrollIntoView).toHaveBeenCalled();
            });

            it('should add an alert and stop the timer upon GET error', function(){
                spyOn($interval, 'cancel');
                $httpBackend.expectGET('/container_logs/container-1/setup').respond(404, {message: 'NO DATA'});
                expect(AlertMsg.alerts.length).toEqual(0);
                $rootScope.loadLog();
                $httpBackend.flush();
                expect(AlertMsg.alerts.length).toEqual(1);
                expect($interval.cancel).toHaveBeenCalled();
            });

            it('should stop the timer if state is SETUP_FINISHED', function(){
                spyOn($interval, 'cancel');
                $httpBackend.expectGET('/container_logs/container-1/setup').respond(200,{state: 'SETUP_FINISHED', setup_log_contents: ['LOG DONE']});
                $rootScope.loadLog();
                $httpBackend.flush();
                expect($interval.cancel).toHaveBeenCalled();
            });

            it('should stop the timer if state is TEARDOWN_FINISHED', function(){
                spyOn($interval, 'cancel');
                $routeParams.action = 'teardown';
                $httpBackend.expectGET('/container_logs/container-1/teardown').respond(200,{state: 'TEARDOWN_FINISHED', teardown_log_contents: ['LOG DONE']});
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
                $httpBackend.expectGET('/container_logs/container-1').respond(200, {state: 'SETUP_IN_PROGRESS'});
                var controller = createController('ContainerLogController');
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
