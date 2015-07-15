describe('Webui Navigation', function(){

    beforeEach(function(){
        browser.get('http://localhost:5000/');
        this.resources = ['license_keys', 'licenses', 'clusters', 'providers', 'nodes'];
    });

    it('should have Gluu Cluster Management as title', function(){
        expect(browser.getTitle()).toEqual('Gluu Cluster Management');
        expect(browser.getLocationAbsUrl()).toBe('/');
    });

    it('should have links for all the resources', function(){
        var links = element( by.css('.nav-sidebar') ).all( by.tagName('li') );
        expect(links.count()).toEqual(this.resources.length);
    });

    describe('sidebar', function(){
        beforeEach(function(){
            this.sidebar = element( by.css('.nav-sidebar') );
        });

        it('should resolve License Keys link its page', function(){
            var resource = 'License Keys';
            var resourceItem = this.sidebar.element( by.cssContainingText('a', resource) );
            resourceItem.click();
            expect( element( by.tagName('h2') ).getText() ).toMatch( resource );
        });

        it('should resolve Licenses link to its page', function(){
            var resource = 'Licenses';
            var resourceItem = this.sidebar.element( by.cssContainingText('a', resource) );
            resourceItem.click();
            expect( element( by.tagName('h2') ).getText() ).toMatch( resource );
        });

        it('should resolve Clusters to its Page', function(){
            var resource = 'Clusters';
            var resourceItem = this.sidebar.element( by.cssContainingText('a', resource) );
            resourceItem.click();
            expect( element( by.tagName('h2') ).getText() ).toMatch( resource );
        });

        it('should resolve Providers to its Page', function(){
            var resource = 'Providers';
            var resourceItem = this.sidebar.element( by.cssContainingText('a', resource) );
            resourceItem.click();
            expect( element( by.tagName('h2') ).getText() ).toMatch( resource );
        });

        it('should resolve Nodes to its Page', function(){
            var resource = 'Nodes';
            var resourceItem = this.sidebar.element( by.cssContainingText('a', resource) );
            resourceItem.click();
            expect( element( by.tagName('h2') ).getText() ).toMatch( resource );
        });
    });
});
