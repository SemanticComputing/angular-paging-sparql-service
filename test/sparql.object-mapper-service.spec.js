/* global inject, module, readJSON */
(function() {
    describe('objectMapperService', function() {
        beforeEach(module('sparql'));

        var objectMapperService;

        beforeEach(inject(function(_objectMapperService_){
            objectMapperService = _objectMapperService_;
        }));

        describe('makeObject', function() {
            it('makes a simple object out of a JSON SPARQL result', function() {
                var obj = readJSON('test/json/simple-object.json');
                var mapped = objectMapperService.makeObject(obj);

                var expected = {
                    id: 'http://ldf.fi/warsa/events/event_1',
                    type: 'http://ldf.fi/warsa/events/event_types/PoliticalActivity',
                    label: 'Eduskunnan viimeinen kokous Kauhajoella.',
                    place: 'http://ldf.fi/warsa/places/municipalities/m_place_119',
                    date: 'http://ldf.fi/warsa/events/times/time_1940-02-12-1940-02-12'
                };

                expect(mapped).toEqual(expected);
            });

            it('it creates objects out of variables containing "__"', function() {
                var obj = readJSON('test/json/deep-object.json');
                var mapped = objectMapperService.makeObject(obj);
                var expectedPlace = {
                    id: 'http://ldf.fi/warsa/places/municipalities/m_place_119',
                    label: 'Kauhajoki',
                    point: {
                        lat: '1',
                        lon: '2'
                    }
                };

                expect(mapped.place).toEqual(expectedPlace);
            });
        });

        describe('mergeObjects', function() {
            it('merges two objects', function() {
                var first = {
                    id: 'http://ldf.fi/warsa/events/event_1',
                    type: 'http://ldf.fi/warsa/events/event_types/PoliticalActivity',
                    place: 'http://ldf.fi/warsa/places/municipalities/m_place_119',
                    date: 'http://ldf.fi/warsa/events/times/time_1940-02-12-1940-02-12'
                };

                var second = {
                    id: 'http://ldf.fi/warsa/events/event_1',
                    type: 'http://ldf.fi/warsa/events/event_types/PoliticalActivity',
                    label: 'Eduskunnan viimeinen kokous Kauhajoella.',
                    date: 'http://ldf.fi/warsa/events/times/time_1940-02-12-1940-02-12'
                };

                var expected = {
                    id: 'http://ldf.fi/warsa/events/event_1',
                    type: 'http://ldf.fi/warsa/events/event_types/PoliticalActivity',
                    label: 'Eduskunnan viimeinen kokous Kauhajoella.',
                    place: 'http://ldf.fi/warsa/places/municipalities/m_place_119',
                    date: 'http://ldf.fi/warsa/events/times/time_1940-02-12-1940-02-12'
                };

                var merged = objectMapperService.mergeObjects(first, second);

                expect(merged).toEqual(expected);
            });

            it('creates a list if the objects have the same property with different values', function() {
                var first = {
                    id: 'http://ldf.fi/warsa/events/event_1',
                    type: 'http://ldf.fi/warsa/events/event_types/PoliticalActivity',
                    place: 'http://ldf.fi/warsa/places/municipalities/m_place_119'
                };

                var second = {
                    id: 'http://ldf.fi/warsa/events/event_1',
                    type: 'http://ldf.fi/warsa/events/event_types/PoliticalActivity',
                    place: 'http://ldf.fi/warsa/places/municipalities/m_place_1'
                };

                var expected = {
                    id: 'http://ldf.fi/warsa/events/event_1',
                    type: 'http://ldf.fi/warsa/events/event_types/PoliticalActivity',
                    place: [
                        'http://ldf.fi/warsa/places/municipalities/m_place_119',
                        'http://ldf.fi/warsa/places/municipalities/m_place_1'
                    ]
                };

                var merged = objectMapperService.mergeObjects(first, second);

                expect(merged).toEqual(expected);
            });

            it('does not create duplicate values', function() {
                var obj = readJSON('test/json/simple-object.json');
                var first = objectMapperService.makeObject(obj);
                var second = objectMapperService.makeObject(obj);

                var merged = objectMapperService.mergeObjects(first, second);

                expect(merged).toBe(first);
            });

            it('handles object values', function() {
                var firstPlace = {
                    id: 'http://ldf.fi/warsa/places/municipalities/m_place_119',
                    label: 'Kauhajoki'
                };
                var secondPlace = {
                    id: 'other',
                    label: 'Kauhajoki'
                };

                var first = {
                    id: 'http://ldf.fi/warsa/events/event_1',
                    type: 'http://ldf.fi/warsa/events/event_types/PoliticalActivity',
                    place: firstPlace
                };

                var second = {
                    id: 'http://ldf.fi/warsa/events/event_1',
                    type: 'http://ldf.fi/warsa/events/event_types/PoliticalActivity',
                    place: secondPlace
                };

                var expected = {
                    id: 'http://ldf.fi/warsa/events/event_1',
                    type: 'http://ldf.fi/warsa/events/event_types/PoliticalActivity',
                    place: [firstPlace, secondPlace]
                };

                var merged = objectMapperService.mergeObjects(first, second);

                expect(merged).toEqual(expected);
            });
        });

        describe('makeObjectList', function() {
            it('creates a list of objects based on SPARQL results', function() {
                var list = readJSON('test/json/simple-object-list.json');
                var expected = readJSON('test/json/expected-simple-list.json');

                var mapped = objectMapperService.makeObjectList(list);

                expect(mapped).toEqual(expected);
            });

            it('merges results if needed', function() {
                var list = readJSON('test/json/merge-list.json');
                var expected = readJSON('test/json/expected-merge-list.json');

                var mapped = objectMapperService.makeObjectList(list);

                expect(mapped).toEqual(expected);
            });
        });

    });
})();
