describe('iD.validations.suspicious_name', function () {
    let context;

    before(function() {
        iD.services.nsi = iD.serviceNsi;
        iD.fileFetcher.cache().nsi_presets = { presets: {} };
        iD.fileFetcher.cache().nsi_features = { type: 'FeatureCollection', features: [] };
        iD.fileFetcher.cache().nsi_dissolved = { dissolved: {} };
        iD.fileFetcher.cache().nsi_replacements = { replacements: {} };

        iD.fileFetcher.cache().nsi_trees = {
          trees: {
            brands: {
              mainTag: 'brand:wikidata'
            }
          }
        };
        iD.fileFetcher.cache().nsi_data = {
          nsi: {
            'brands/shop/supermarket': {
              properties: {
                path: 'brands/shop/supermarket',
                exclude: {
                  generic: ['^(mini|super)?\\s?(market|mart|mercado)( municipal)?$' ],
                  named: ['^(famiglia cooperativa|семейный)$']
                }
              }
            }
          }
        };
        iD.fileFetcher.cache().nsi_generics = {
          genericWords: ['^stores?$']
        };
    });

    after(function() {
        delete iD.services.nsi;
    });

    beforeEach(function() {
        context = iD.coreContext().assetPath('../dist/').init();
    });

    function createWay(tags) {
        let n1 = iD.osmNode({id: 'n-1', loc: [4,4]});
        let n2 = iD.osmNode({id: 'n-2', loc: [4,5]});
        let n3 = iD.osmNode({id: 'n-3', loc: [5,5]});
        let w = iD.osmWay({id: 'w-1', nodes: ['n-1', 'n-2', 'n-3'], tags: tags});

        context.perform(
            iD.actionAddEntity(n1),
            iD.actionAddEntity(n2),
            iD.actionAddEntity(n3),
            iD.actionAddEntity(w)
        );
    }

    function validate(validator) {
        let changes = context.history().changes();
        let entities = changes.modified.concat(changes.created);
        let issues = [];
        entities.forEach(function(entity) {
            issues = issues.concat(validator(entity, context.graph()));
        });
        return issues;
    }

    it('has no errors on init', function(done) {
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('ignores way with no tags', function(done) {
        createWay({});
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('ignores feature with no name', function(done) {
        createWay({ shop: 'supermarket' });
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('ignores feature with a specific name', function(done) {
        createWay({ shop: 'supermarket', name: 'Lou\'s' });
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('ignores feature with a specific name that includes a generic name', function(done) {
        createWay({ shop: 'supermarket', name: 'Lou\'s Store' });
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('ignores feature matching excludeNamed pattern in name-suggestion-index', function(done) {
        createWay({ shop: 'supermarket', name: 'famiglia cooperativa' });
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('flags feature matching a excludeGeneric pattern in name-suggestion-index', function(done) {
        createWay({ shop: 'supermarket', name: 'super mercado' });
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(1);
            let issue = issues[0];
            expect(issue.type).to.eql('suspicious_name');
            expect(issue.subtype).to.eql('generic_name');
            expect(issue.entityIds).to.have.lengthOf(1);
            expect(issue.entityIds[0]).to.eql('w-1');
            done();
        }, 20);
    });

    it('flags feature matching a global exclude pattern in name-suggestion-index', function(done) {
        createWay({ shop: 'supermarket', name: 'store' });
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(1);
            let issue = issues[0];
            expect(issue.type).to.eql('suspicious_name');
            expect(issue.subtype).to.eql('generic_name');
            expect(issue.entityIds).to.have.lengthOf(1);
            expect(issue.entityIds[0]).to.eql('w-1');
            done();
        }, 20);
    });

    it('flags feature with a name that is just a defining tag key', function(done) {
        createWay({ amenity: 'drinking_water', name: 'Amenity' });
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(1);
            let issue = issues[0];
            expect(issue.type).to.eql('suspicious_name');
            expect(issue.subtype).to.eql('generic_name');
            expect(issue.entityIds).to.have.lengthOf(1);
            expect(issue.entityIds[0]).to.eql('w-1');
            done();
        }, 20);
    });

    it('flags feature with a name that is just a defining tag value', function(done) {
        createWay({ shop: 'red_bicycle_emporium', name: 'Red Bicycle Emporium' });
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(1);
            let issue = issues[0];
            expect(issue.type).to.eql('suspicious_name');
            expect(issue.subtype).to.eql('generic_name');
            expect(issue.entityIds).to.have.lengthOf(1);
            expect(issue.entityIds[0]).to.eql('w-1');
            done();
        }, 20);
    });

    it('ignores feature with a non-matching `not:name` tag', function(done) {
        createWay({ shop: 'supermarket', name: 'Lou\'s', 'not:name': 'Lous' });
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('flags feature with a matching `not:name` tag', function(done) {
        createWay({ shop: 'supermarket', name: 'Lous', 'not:name': 'Lous' });
        let validator = iD.validationSuspiciousName(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(1);
            let issue = issues[0];
            expect(issue.type).to.eql('suspicious_name');
            expect(issue.subtype).to.eql('not_name');
            expect(issue.entityIds).to.have.lengthOf(1);
            expect(issue.entityIds[0]).to.eql('w-1');
            done();
        }, 20);
    });

    it('flags feature with a matching a semicolon-separated `not:name` tag', function(done) {
        createWay({ shop: 'supermarket', name: 'Lous', 'not:name': 'Louis\';Lous;Louis\'s' });
        window.setTimeout(function() {   // async, so data will be available
            let validator = iD.validationSuspiciousName(context);
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(1);
            let issue = issues[0];
            expect(issue.type).to.eql('suspicious_name');
            expect(issue.subtype).to.eql('not_name');
            expect(issue.entityIds).to.have.lengthOf(1);
            expect(issue.entityIds[0]).to.eql('w-1');
            done();
        }, 20);
    });

});
