describe('OverviewController', function(){

    var $httpBackend, $rootScope, createController, AlertMsg, $routeParams;
    beforeEach(module('webuiControllers'));

    // Inject the stuff required
    beforeEach(inject(function($injector){
        // mock all the http requests
        $httpBackend = $injector.get('$httpBackend');
        $rootScope = $injector.get('$rootScope');
        AlertMsg = $injector.get('AlertMsg');
        $routeParams = {resource: 'providers', id: 'some-id'};
        var $controller = $injector.get('$controller');
        createController = function(){
            return $controller('OverviewController', {'$scope': $rootScope, 'AlertMsg': AlertMsg, '$routeParams': $routeParams});
        };

    }));

    afterEach(function() {
         $httpBackend.verifyNoOutstandingExpectation();
         $httpBackend.verifyNoOutstandingRequest();
    });

    describe('intialization of controller', function(){
        it('should get the resource name from routeParams and load overview data', function(){
            var resources = [{id: 'some-id', hostname: 'testhost', type: 'master'}];
            $httpBackend.expectGET('/providers').respond(200, resources);
            var contoller = createController();
            $httpBackend.flush();

            expect($rootScope.currentResource).toEqual('Providers');
            expect($rootScope.currentResURI).toEqual('providers');
            expect($rootScope.contents).toEqual(resources);
        });

        it('should add an alert if there are no resources in response', function(){
            expect(AlertMsg.alerts.length).toEqual(0);
            $httpBackend.expectGET('/providers').respond(200, []);
            var controller = createController();
            $httpBackend.flush();
            expect(AlertMsg.alerts.length).toEqual(1);
        });

        it('should add an alert if resource req returns non-200 resp', function(){
            expect(AlertMsg.alerts.length).toEqual(0);
            $httpBackend.expectGET('/providers').respond(400, {message: 'nodata'});
            var controller = createController();
            $httpBackend.flush();
            expect(AlertMsg.alerts.length).toEqual(1);
        });

    });

    describe('$scope.loadResource', function(){
        // setup the intial values
        beforeEach(function(){
            $httpBackend.when('GET', '/providers').respond([{id: 'some-id'}]);
            var controller = createController();
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
            var controller = createController();
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
    });



});
