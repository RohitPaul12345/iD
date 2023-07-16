describe('iD.validations.missing_role', function () {
    let context;

    beforeEach(function() {
        context = iD.coreContext().assetPath('../dist/').init();
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

    function createRelation(tags, role) {
        let n1 = iD.osmNode({id: 'n-1', loc: [4,4]});
        let n2 = iD.osmNode({id: 'n-2', loc: [4,5]});
        let n3 = iD.osmNode({id: 'n-3', loc: [5,5]});
        let w = iD.osmWay({id: 'w-1', nodes: ['n-1', 'n-2', 'n-3', 'n-1']});
        let r = iD.osmRelation({id: 'r-1', members: [{id: 'w-1', role: role}], tags: tags});

        context.perform(
            iD.actionAddEntity(n1),
            iD.actionAddEntity(n2),
            iD.actionAddEntity(n3),
            iD.actionAddEntity(w),
            iD.actionAddEntity(r)
        );
    }

    function validate() {
        let validator = iD.validationMissingRole(context);
        let changes = context.history().changes();
        let entities = changes.modified.concat(changes.created);
        let issues = [];
        entities.forEach(function(entity) {
            issues = issues.concat(validator(entity, context.graph()));
        });
        return issues;
    }

    it('has no errors on init', function() {
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with no relations', function() {
        createWay({});
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with null role in non-multipolygon relation', function() {
        createRelation({ type: 'boundary' }, null);
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with outer role in multipolygon', function() {
        createRelation({ type: 'multipolygon' }, 'outer');
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('ignores way with inner role in multipolygon', function() {
        createRelation({ type: 'multipolygon' }, 'inner');
        let issues = validate();
        expect(issues).to.have.lengthOf(0);
    });

    it('flags way with null role in multipolygon', function() {
        createRelation({ type: 'multipolygon' }, null);
        let issues = validate();
        expect(issues).to.have.lengthOf(2);
        expect(issues[0].id).to.eql(issues[1].id);
        let issue = issues[0];
        expect(issue.type).to.eql('missing_role');
        expect(issue.entityIds).to.have.lengthOf(2);
        expect(issue.entityIds[0]).to.eql('r-1');
        expect(issue.entityIds[1]).to.eql('w-1');
    });

    it('flags way with whitespace string role in multipolygon', function() {
        createRelation({ type: 'multipolygon' }, '   ');
        let issues = validate();
        expect(issues).to.have.lengthOf(2);
        expect(issues[0].id).to.eql(issues[1].id);
        let issue = issues[0];
        expect(issue.type).to.eql('missing_role');
        expect(issue.entityIds).to.have.lengthOf(2);
        expect(issue.entityIds[0]).to.eql('r-1');
        expect(issue.entityIds[1]).to.eql('w-1');
    });

});
