describe('Controllers', function(){

    var $httpBackend, $rootScope, createController, AlertMsg, $routeParams, $location;
    beforeEach(module('webuiControllers'));

    // Inject the stuff required
    beforeEach(inject(function($injector){
        // mock all the http requests
        $httpBackend = $injector.get('$httpBackend');
        $rootScope = $injector.get('$rootScope');
        AlertMsg = $injector.get('AlertMsg');
        $location = $injector.get('$location');
        $routeParams = {resource: 'providers', id: 'some-id'};
        var $controller = $injector.get('$controller');
        createController = function( name ){
            var deps = {'$scope': $rootScope, 'AlertMsg': AlertMsg, '$routeParams': $routeParams};
            if( name === 'ResourceController' ){
                    deps.$location = $location;
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
                it('should get the list of clusters, providers and nodes for Node form', function(){
                    $routeParams = {resource: 'nodes'};
                    $httpBackend.expectGET('/clusters').respond(200, [{id: 'id1', name: 'cluster1'}]);
                    $httpBackend.expectGET('/providers').respond(200, [{id: 'id2', hostname: 'provider1'}]);
                    $httpBackend.expectGET('/nodes').respond(200, [{id: 'id3', name: 'node1'}]);
                    var controller = createController('ResourceController');
                    $httpBackend.flush();
                    expect($rootScope.clusters.length).toEqual(1);
                    expect($rootScope.providers.length).toEqual(1);
                    expect($rootScope.oxauth_nodes.length).toEqual(0);
                    expect($rootScope.oxtrust_nodes.length).toEqual(0);
                });

                it('should load the oxauth & oxtrust id and names for selection in New Node form', function(){
                    $routeParams = {resource: 'nodes'};
                    $httpBackend.expectGET('/clusters').respond(200, [{id: 'id1', name: 'cluster1'}]);
                    $httpBackend.expectGET('/providers').respond(200, [{id: 'id2', hostname: 'provider1'}]);
                    var nodes = [{type: 'ldap', id: 'id1', name: 'node1'}, {type: 'oxtrust', id: 'id2', name: 'node2'},
                                 {type: 'oxauth', id: 'id3', name: 'node3'}, {type: 'httpd', id: 'id4', name: 'node4'},
                                 {type: 'oxtrust', id: 'id5', name: 'node5'}];
                    $httpBackend.expectGET('/nodes').respond(200, nodes);
                    var controller = createController('ResourceController');
                    $httpBackend.flush();
                    expect($rootScope.oxtrust_nodes.length).toEqual(2);
                    expect($rootScope.oxauth_nodes.length).toEqual(1);
                });

                it('should post alerts when dependency fetching fails for New Node', function(){
                    $routeParams = {resource: 'nodes'};
                    $httpBackend.expectGET('/clusters').respond(400, {message: 'NOT OK'});
                    $httpBackend.expectGET('/providers').respond(400, {message: 'NOT OK'});
                    $httpBackend.expectGET('/nodes').respond(400, {message: 'NOT OK'});
                    expect(AlertMsg.alerts.length).toEqual(0);
                    var controller = createController('ResourceController');
                    $httpBackend.flush();
                    expect(AlertMsg.alerts.length).toEqual(3);
                });
            });
           
            /*
             *  Test to verify NEW PROVIDER specific actions
             *
             */

            describe('when resource is PROVIDER', function(){
                beforeEach(function(){
                    $routeParams = {resource: 'providers'};
                });

                it('should load the licenses to scope', function(){
                    $httpBackend.expectGET('/licenses').respond(200, [{id: 'id', metadata:{ license_name: 'some license'}}]);
                    var controller = createController('ResourceController');
                    $httpBackend.flush();
                    expect($rootScope.license).toEqual({id: 'id', name: 'some license'});
                    expect($rootScope.license).toBeTruthy(); // for UI feedback
                });

                it('should add an alert if it cannot GET /licenses', function(){
                    $httpBackend.expectGET('/licenses').respond(400, {message: 'no license'});
                    expect(AlertMsg.alerts.length).toEqual(0);
                    var controller = createController('ResourceController');
                    $httpBackend.flush();
                    expect(AlertMsg.alerts.length).toEqual(1);
                    expect($rootScope.license).toBeFalsy();
                });

                it('should set scope.license value to falsy so UI feedback can be done', function(){
                    $httpBackend.expectGET('/licenses').respond(200, []);
                    var controller = createController('ResourceController');
                    $httpBackend.flush();
                    expect($rootScope.license).toBeFalsy();
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
});


