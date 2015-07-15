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

    it('should resolve /license_keys to License Keys Page', function(){
        var sidebar = element( by.css('.nav-sidebar') );
        var cluster = sidebar.element( by.cssContainingText('a', 'Clusters') );
        cluster.click();
        expect( element( by.tagName('h2') ).getText() ).toMatch( 'Clusters' );
    });

    it('should resolve /licenses to License Keys Page', function(){
        var sidebar = element( by.css('.nav-sidebar') );
        var cluster = sidebar.element( by.cssContainingText('a', 'Licenses') );
        cluster.click();
        expect( element( by.tagName('h2') ).getText() ).toMatch( 'Licenses' );
    });


});
