describe('iD.validations.outdated_tags', function () {
    let context;

    before(function() {
        iD.fileFetcher.cache().deprecated = [
          { old: { highway: 'no' } },
          { old: { highway: 'ford' }, replace: { ford: '*' } }
        ];
    });

    after(function() {
        iD.fileFetcher.cache().deprecated = [];
    });

    beforeEach(function() {
        context = iD.coreContext().init();
    });


    function createWay(tags) {
        let n1 = iD.osmNode({id: 'n-1', loc: [4,4]});
        let n2 = iD.osmNode({id: 'n-2', loc: [4,5]});
        let w = iD.osmWay({id: 'w-1', nodes: ['n-1', 'n-2'], tags: tags});

        context.perform(
            iD.actionAddEntity(n1),
            iD.actionAddEntity(n2),
            iD.actionAddEntity(w)
        );
    }

    function createRelation(wayTags, relationTags) {
        let n1 = iD.osmNode({id: 'n-1', loc: [4,4]});
        let n2 = iD.osmNode({id: 'n-2', loc: [4,5]});
        let n3 = iD.osmNode({id: 'n-3', loc: [5,5]});
        let w = iD.osmWay({id: 'w-1', nodes: ['n-1', 'n-2', 'n-3', 'n-1'], tags: wayTags});
        let r = iD.osmRelation({id: 'r-1', members: [{id: 'w-1'}], tags: relationTags});

        context.perform(
            iD.actionAddEntity(n1),
            iD.actionAddEntity(n2),
            iD.actionAddEntity(n3),
            iD.actionAddEntity(w),
            iD.actionAddEntity(r)
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
        let validator = iD.validationOutdatedTags(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('has no errors on good tags', function(done) {
        createWay({'highway': 'unclassified'});
        let validator = iD.validationOutdatedTags(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('flags deprecated tag with replacement', function(done) {
        createWay({'highway': 'ford'});
        let validator = iD.validationOutdatedTags(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(1);
            let issue = issues[0];
            expect(issue.type).to.eql('outdated_tags');
            expect(issue.subtype).to.eql('deprecated_tags');
            expect(issue.severity).to.eql('warning');
            expect(issue.entityIds).to.have.lengthOf(1);
            expect(issue.entityIds[0]).to.eql('w-1');
            done();
        }, 20);
    });

    it('flags deprecated tag with no replacement', function(done) {
        createWay({'highway': 'no'});
        let validator = iD.validationOutdatedTags(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(1);
            let issue = issues[0];
            expect(issue.type).to.eql('outdated_tags');
            expect(issue.subtype).to.eql('deprecated_tags');
            expect(issue.severity).to.eql('warning');
            expect(issue.entityIds).to.have.lengthOf(1);
            expect(issue.entityIds[0]).to.eql('w-1');
            done();
        }, 20);
    });

    it('ignores way with no relations', function(done) {
        createWay({});
        let validator = iD.validationOutdatedTags(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('ignores multipolygon tagged on the relation', function(done) {
        createRelation({}, { type: 'multipolygon', building: 'yes' });
        let validator = iD.validationOutdatedTags(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.have.lengthOf(0);
            done();
        }, 20);
    });

    it('flags multipolygon tagged on the outer way', function(done) {
        createRelation({ building: 'yes' }, { type: 'multipolygon' });
        let validator = iD.validationOutdatedTags(context);
        window.setTimeout(function() {   // async, so data will be available
            let issues = validate(validator);
            expect(issues).to.not.have.lengthOf(0);
            let issue = issues[0];
            expect(issue.type).to.eql('outdated_tags');
            expect(issue.subtype).to.eql('old_multipolygon');
            expect(issue.entityIds).to.have.lengthOf(2);
            expect(issue.entityIds[0]).to.eql('w-1');
            expect(issue.entityIds[1]).to.eql('r-1');
            done();
        }, 20);
    });

});
