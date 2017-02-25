"use strict";

const cheerio = require('cheerio');
const request = require('request-promise');


const trashtypes = ['P', 'G', 'B', 'R2', 'R4'];
const baseDateUrl =
  `http://www.awb-es.de/abfuhr/abfuhrtermine/__Abfuhrtermine-suchen.html?direct=true`;
const baseDistrictUrl =
  `http://www.awb-es.de/statics/abfallplus/abfuhrbezirke.php`

let parseGermanDate = function(input) {
  var parts = input.match(/(\d+)/g);
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

let getDistrictData = function(data) {
  let requestUrl = baseDistrictUrl;
  return request
    .post(requestUrl)
    .form(data)
    .then((response) => {
      let parsedData = JSON.parse(response);
      return parsedData;
    });
}

let getDateResponse = function(city, street) {
  let requestUrl = baseDateUrl + `&city=${city}&street=${street}`;
  return request
    .get(requestUrl);
}

let extractDates = function(data) {
  let parsedDates = [];

  //parse the HTML
  let $ = cheerio.load(data);

  let dateBlocks = $('.DatesLeft, .DatesRight');
  let dates = dateBlocks.find('tr:not(:has(.Headline))');

  dates.each((index, element) => {
    let date = $(element).find('.Date').text();
    let parsedDate = parseGermanDate(date);

    let types = [];
    $(element).find('.Waste span').each((_, child) => {
      types.push($(child).text());
    });

    parsedDates.push({
      date: parsedDate,
      types: types
    })

  });
  return parsedDates;
}

let filterDatesForType = function(trashtype) {
  return function(dates) {
    //check if trashtype is defined
    if (trashtype) {
      return dates.filter((date) => {
        return date.trashtype == trashtype;
      });
    } else {
      //return identity
      return dates;
    }
  }
}

module.exports.getDistrictDates = function(city, street, trashtype) {
  return getDateResponse(city, street)
    .then(extractDates)
    .then(filterDatesForType(trashtype));
};

module.exports.getDistrictCities = function(city) {
  return getDistrictData({
    search: 'city',
    city: city
  });
};

module.exports.getDistrictStreets = function(city, street) {
  return getDistrictData({
    search: 'citystreet',
    city: city,
    street: street
  });
};
