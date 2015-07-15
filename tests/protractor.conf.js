exports.config = {
    capabilities: {
        browserName: 'firefox'
    },

    seleniumAddress: 'http://localhost:4444/wd/hub',
    specs: ['e2e/*Spec.js'],
};
