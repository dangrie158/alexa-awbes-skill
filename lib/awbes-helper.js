"use strict";

const cheerio = require('cheerio');
const request = require('request-promise');


const trashtypes = ['P', 'G', 'B', 'R2', 'R4'];
const typeMapping = {
  "bio": "B",
  "biomüll": "B",
  "braune tonne": "B",
  "papier": "P",
  "blaue tonne": "P",
  "plastik": "G",
  "gelber sack": "G",
  "gelbe tonne": "G",
  "restmüll": "R",
  "rest": "R"
}

const baseDateUrl =
  `http://www.awb-es.de/abfuhr/abfuhrtermine/__Abfuhrtermine-suchen.html?direct=true`;
const baseDistrictUrl =
  `http://www.awb-es.de/statics/abfallplus/abfuhrbezirke.php`

//check if two dates are on the same day
let isSameDay = function(date1, date2) {
  return (
    date1.getDate() == date2.getDate() &&
    date1.getMonth() == date2.getMonth() &&
    date1.getFullYear() == date2.getFullYear());
}

//check if a date is in the future
let isInFuture = function(date) {
  return date > new Date();
}

//parse a date in a notation that is common in germany (DD.MM.YYYY)
let parseGermanDate = function(input) {
  var parts = input.match(/(\d+)/g);
  return new Date(parts[2], parts[1] - 1, parts[0]);
}

//use the AWB-ES backend to get information about districts
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

//get a page of the AWB-ES frontend
let getDateResponse = function(city, street) {
  let requestUrl = baseDateUrl + `&city=${city}&street=${street}`;
  return request
    .get(requestUrl);
}

//extract date information from a HTML site of the AWB-ES frontend
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

//filter a list of dates for a specific type
//if trashtype is undefined, the filter returns the inputs identity
let filterDatesForType = function(trashtype) {
  return function(dates) {
    //check if trashtype is defined
    if (trashtype) {
      return dates.filter((date) => {
        return date.types.indexOf(trashtype) != -1;
      });
    } else {
      //return identity
      return dates;
    }
  }
}

//convert a spoken trash type to a usable key
module.exports.keyForType = function(type) {
  return typeMapping[type.toLowerCase()];
}

//get the dates for a district
module.exports.getDistrictDates = function(city, street, trashtype) {
  return getDateResponse(city, street)
    .then(extractDates)
    .then(filterDatesForType(trashtype))
    .then((dates) => {
      return dates.filter((date) => isInFuture(date.date));
    });
};

//get city suggestions
module.exports.getDistrictCities = function(city) {
  return getDistrictData({
    search: 'city',
    city: city
  });
};

//get street suggestions
module.exports.getDistrictStreets = function(city, street) {
  return getDistrictData({
    search: 'citystreet',
    city: city,
    street: street
  });
};

//get the next date for a specific trash type
module.exports.getNextDateForType = function(city, street, trashtype) {
  return module.exports.getDistrictDates(city, street, trashtype)
    .then((dates) => {
      // the data is ordered from the site
      // and this order is never destroyed,
      // so we can just pick the first element
      return dates[0];
    });
};

//get all trashtypes that are due tomorrow
module.exports.getTypesOfTomorrow = function(city, street) {
  return module.exports.getDistrictDates(city, street)
    .then((dates) => {
      let tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
      let types = [];
      dates
        .filter((date) => isSameDay(date.date, tomorrow))
        .forEach((date) => {
          types = types.concat(date.types);
        });
      return types;
    })
};

// get a list of the next date for every trash type
module.exports.getAllNextDates = function(city, street) {
  return module.exports.getDistrictDates(city, street)
    .then((dates) => {
      let typesFound = [];
      let datesFound = [];
      dates.forEach((date) => {
        date.types.forEach((type) => {
          if (typesFound.indexOf(type) == -1) {
            datesFound.push({
              date: date.date,
              type: type
            });
            typesFound.push(type);
          }
        });
      });
      return datesFound;
    })
};
