'use strict';

const Alexa = require("alexa-sdk");
const dateHelper = require('./lib/awbes-helper')

const appId = ''; //'amzn1.echo-sdk-ams.app.your-skill-id';

const languageStrings = {
  "de-DE": {
    "translation": {
      "SKILL_NAME": "Abfuhrtermine Abfallwirtschaftsbetrieb Esslingen",
      "ERROR": "Es ist ein fehler aufgetreten, versuche es später noch einmal",
      "WELCOME_MESSAGE": "Willkommen",
      "NEXT_DATE_MESSAGE": "Der nächste Abfuhrtermin",
      "NEXT_DATES_IN_DISTRICT_MESSAGE": "Hier sind die nächsten Termine im Abholbezirk",
      "CITY_SAVED_MESSAGE_1": "Ich habe deinen Wohnort",
      "CITY_SAVED_MESSAGE_2": "gespeichert",
      "STREET_SAVED_MESSAGE_1": "Ich habe die Straße:",
      "STREET_SAVED_MESSAGE_2": "gespeichert",
      "FOUND_MULTIPLE_CITIES": "Ich fabe folgende Städte gefunden:",
      "FOUND_MULTIPLE_CITIES": "Ich fabe mehrere Straßen gefunden:",
      "PRECISE": "Welche davon ist die richtige",
      "DIDNT_GET_IT_MESSAGE": "Entschuldigung, das habe ich leider nicht verstanden",
      "IN": "in",
      "FOR": "für",
      "IS": "ist",
      "ON": "am",
      "WASTE_TYPE_BIO": "Biomüll",
      "WASTE_TYPE_PAPER": "Papier",
      "WASTE_TYPE_RECYCLING": "Gelber Sack",
      "WASTE_TYPE_REST": "Restmüll",
      "WASTE_TYPE_REST_2": "Restmüll, 2-wöchentlich",
      "WASTE_TYPE_REST_4": "Restmüll, 4-wöchentlich",
      "HELP_REPROMPT": "Du kannst nach dem nächsten Abfuhrtermin für eine Müllsorte fragen.",
      "HELP_MESSAGE": "Was möchtest du wissen?",
      "STOP_MESSAGE": "Auf Wiedersehen!",
      "SETUP_CITY_MESSAGE": "Zuerst muss ich wissen wo du wohnst.",
      "SETUP_CITY_QUESTION": "Sage mir zuerst den Namen deiner Stadt.",
      "SETUP_STREET_QUESTION": "In welcher Straße wohnst du?"
    }
  }
};

var states = {
  CITY_MODE: '_CITYMODE', // User is entering his city
  STREET_MODE: '_STREETMODE', // user is entering his street
  READY_MODE: '_READYMODE' // user has setup the skill
};

exports.handler = function(event, context, callback) {
  var alexa = Alexa.handler(event, context);
  alexa.appId = appId;
  alexa.dynamoDBTableName = 'awbes-date-users';
  alexa.registerHandlers(newSessionHandlers, setupCityHandler,
    setupStreetHandler);
  alexa.execute();
};

var newSessionHandlers = {
  'NewSession': function() {
    this.emit(':tell', this.t['WELCOME_MESSAGE']);
    if (this.attributes.city = '') {
      this.handler.state = states.CITY_MODE;
      this.emit('PromptCityInput');
    } else if (this.attributes.street = '') {
      this.handler.state = states.STREET_MODE;
      this.emit('PromptStreetInput');
    } else {
      this.emit(':ask', this.t['HELP_MESSAGE'], this.t['HELP_REPROMPT']);
      this.handler.state = states.READY_MODE;
    }
  },
  "AMAZON.StopIntent": function() {
    this.emit(':tell', this.t['STOP_MESSAGE']);
  },
  "AMAZON.CancelIntent": function() {
    this.emit(':tell', this.t['STOP_MESSAGE']);
  },
  'SessionEndedRequest': function() {
    console.log('session ended!');
    this.emit(":tell", this.t['STOP_MESSAGE']);
  },
  'Unhandled': function() {
    this.emit(':ask', this.t['DIDNT_GET_IT_MESSAGE'] +
      this.t['HELP_REPROMPT']);
  }
};

var setupCityHandler = Alexa.CreateStateHandler(states.CITY_MODE, {
  'NewSession': function() {
    this.emit('NewSession'); // Uses the handler in newSessionHandlers
  },
  'PromptCityInput': function() {
    this.emit(':ask',
      this.t['SETUP_CITY_MESSAGE'] + this.t['SETUP_CITY_QUESTION']);
  },
  'SetCityIntent': function() {
    let cityInput = this.event.request.intent.slots.city;
    dataHelper.getDistrictCities(cityInput)
      .then((foundCities) => {
        if (foundCities.length == 1) {
          this.emit(':say', this.t['CITY_SAVED_MESSAGE1'] +
            foundCities[0] +
            this.t['CITY_SAVED_MESSAGE_2']);
          this.attributes.city = foundCities[0];
          this.handler.state = states.STREET_MODE;
          this.emit('PromptStreetInput');
        } else {
          this.emit(':say', this.t['FOUND_MULTIPLE_CITIES'] +
            foundCities.join(','));
          this.emit(':ask', this.t['PRECISE']);
        }
      })
      .catch((e) => {
        console.error(e);
        this.emit(':say', this.t['ERROR']);
      })
  }
});

var setupStreetHandler = Alexa.CreateStateHandler(states.STREET_MODE, {
  'NewSession': function() {
    this.emit('NewSession'); // Uses the handler in newSessionHandlers
  },
  'PromptStreetInput': function() {
    this.emit(':ask',
      this.t['SETUP_STREET_QUESTION']
    );
  },
  'SetStreetIntent': function() {
    let streetInput = this.event.request.intent.slots.street;
    let city = this.attributes.city;
    dataHelper.getDistrictStreets(city, streetInput)
      .then((foundStreets) => {
        if (foundStreets.length == 1) {
          this.emit(':say', this.t['STREET_SAVED_MESSAGE1'] +
            foundStreets[0] +
            this.t['STREET_SAVED_MESSAGE2']);
          this.attributes.street = foundStreets[0];
          this.handler.state = states.READY_MODE;
          this.emit('TellNextDates');
        } else {
          this.emit(':say', this.t['FOUND_MULTIPLE_STREETS'] +
            foundStreets.join(','));
          this.emit(':ask', this.t['PRECISE']);
        }
      })
      .catch((e) => {
        console.error(e);
        this.emit(':say', this.t['ERROR']);
      })
  }
});

var dateHandler = Alexa.CreateStateHandler(states.READY_MODE, {
  'NewSession': function() {
    this.emit('NextDatesIntent');
  },
  'NextDatesIntent': function() {
    this.emit(':say', this.t['NEXT_DATES_IN_DISTRICT_MESSAGE'] + this.attributes
      .city + ', ', +this.attributes.street);
  }
});
