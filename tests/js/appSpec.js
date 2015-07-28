describe('Gluu Web UI', function(){
    var $route;
    beforeEach(module('gluuwebui'));

    describe('route based assignment', function(){
        beforeEach(inject(function($injector){
            $route = $injector.get('$route');
        }));

        it('should route / to dashboard', function(){
            expect($route.routes['/'].templateUrl).toMatch('templates/dashboard.html');
            expect($route.routes['/'].controller).toMatch('DashboardController');
        });

        it('should have OverviewController for /resource', function(){
            expect($route.routes['/:resource'].controller).toMatch('OverviewController');
        });

        it('should have ResourceController for /action/resouce/id?', function(){
            expect($route.routes['/:action/:resource/:id?'].controller).toMatch('ResourceController');
        });
    });

    describe('templateMaker', function(){
        var resources = ['license_keys', 'providers', 'clusters', 'nodes'];
        describe('function getTemplate', function(){
            it('should return a valid template for /resource', function(){
                for( var i in resources ){
                    var params = {resource: resources[i]};
                    expect(templateMaker.getTemplate(params)).toMatch('templates/'+resources[i]+'.html');
                }
                expect(templateMaker.getTemplate({resource: 'everthing else'})).toMatch('templates/404.html');
            });

            it('should return a template url for new and edit actions', function(){
                // FIXME Negative assertions are costly
                for(var i in resources){
                    var params = {action: 'new', resource: resources[i]};
                    expect(templateMaker.getTemplate(params)).not.toMatch('templates/404.html');
                }
                for(i in resources){
                    var params2 = {action: 'edit', resource: resources[i]};
                    expect(templateMaker.getTemplate(params2)).not.toMatch('templates/404.html');
                }
            });

            it('should return a 404 template for random urls', function(){
                var randomUrls = [
                    // url /anything resolves {resource: anything}
                    {resource: 'some-string'},
                    {resource: 'provider'}, // resource in non plural form
                    // url /something/anything resolves {action: something, resource: anything}
                    // Valid actions with invalid resources
                    {resource: 'non-existent', action: 'new'},
                    {resource: 'non-existent', action: 'edit'},
                    // Invalid actions with valid resources
                    {resource: 'clusters', action: 'add'},
                    {resource: 'nodes', action: 'remove'},
                    {resource: 'nodes', action: 'anything-you-dream%20f'},
                    // Invalid actions with Invalid resources
                    {resource: 'resource', action: 'try adding'},
                    {resource: 'that don\'t', action: 'removeit'},
                    {resource: 'exist', action: 'anything-you-dream%20f'},
                ];
                for(var i in randomUrls){
                    expect(templateMaker.getTemplate(randomUrls[i])).toMatch('templates/404.html');
                }
            });
        });
    });
});
