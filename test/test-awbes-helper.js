var assert = require('assert');

var testling = require('../lib/awbes-helper.js');

describe('AWB-ES Helper', function() {
  describe('#getDistrictCities', function() {
    it(
      'should return an empty array when searching for an unknown city',
      function(done) {
        testling.getDistrictCities('NoRealCity')
          .then((data) => {
            assert.deepEqual(data, []);
            done();
          })
          .catch((err) => done(err));
      });

    it(
      'should return the full city name when passed part of the name',
      function(done) {
        testling.getDistrictCities('Leinfelden')
          .then((data) => {
            assert.deepEqual(data, ['Leinfelden-Echterdingen']);
            done();
          })
          .catch((err) => done(err));
      });
  });

  describe('#getDistrictStreets', function() {
    it(
      'should return an empty array when searching for an unknown street',
      function(done) {
        testling.getDistrictStreets('Leinfelden-Echterdingen',
            'NoRealStreet')
          .then((data) => {
            assert.deepEqual(data, []);
            done();
          })
          .catch((err) => done(err));
      });

    it(
      'should return the full street name when passed part of it',
      function(done) {
        testling.getDistrictStreets('Leinfelden-Echterdingen',
            'Fuchs')
          .then((data) => {
            assert.deepEqual(data, ['Fuchsweg']);
            done();
          })
          .catch((err) => done(err));
      });
  });

  describe('#getDistrictDates', function() {
    it(
      'should get a list of dates for a known district',
      function(done) {
        testling.getDistrictDates('Leinfelden-Echterdingen',
            'Fuchsweg')
          .then((data) => {
            assert.notEqual(data.length, 0);
            done();
          })
          .catch((err) => done(err));
      });

    it(
      'should return an empty list when filtering for an unknown waste type',
      function(done) {
        testling.getDistrictDates('Leinfelden-Echterdingen',
            'Fuchsweg', 'NotATrashType')
          .then((data) => {
            assert.equal(data.length, 0);
            done();
          })
          .catch((err) => done(err));
      });

    it(
      'should not return an non empty list when filtering for a known waste type',
      function(done) {
        testling.getDistrictDates('Leinfelden-Echterdingen',
            'Fuchsweg', 'B')
          .then((data) => {
            assert.notEqual(data.length, 0);
            done();
          })
          .catch((err) => done(err));
      });
  });
  describe('#getNextDateForType', function() {
    it(
      'should not be empty for a type',
      function(done) {
        testling.getNextDateForType('Leinfelden-Echterdingen',
            'Fuchsweg', 'B')
          .then((data) => {
            assert.notEqual(data.length, 0);
            done();
          })
          .catch((err) => done(err));
      });
  });
});
