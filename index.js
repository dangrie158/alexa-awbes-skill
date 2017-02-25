'use strict';

const Alexa = require("alexa-sdk");
const dateHelper = require('./lib/awbes-helper')

const appId = 'amzn1.ask.skill.f4c1ed22-9da3-4214-936a-7b9c64a6b599';

const languageStrings = {
  "de-DE": {
    "translation": {
      "SKILL_NAME": " Abfuhrtermine Abfallwirtschaftsbetrieb Esslingen ",
      "ERROR": " Es ist ein fehler aufgetreten, versuche es später noch einmal ",
      "WELCOME_MESSAGE": " Willkommen ",
      "NEXT_DATE_MESSAGE": " Der nächste Abfuhrtermin ",
      "NEXT_DATES_IN_DISTRICT_MESSAGE": " Hier sind die nächsten Termine im Abholbezirk ",
      "CITY_SAVED_MESSAGE_1": " Ich habe deinen Wohnort ",
      "CITY_SAVED_MESSAGE_2": " gespeichert. ",
      "STREET_SAVED_MESSAGE_1": " Ich habe die Straße: ",
      "STREET_SAVED_MESSAGE_2": " gespeichert. ",
      "FOUND_MULTIPLE_CITIES": " Ich fabe folgende Städte gefunden: ",
      "FOUND_MULTIPLE_STREETS": " Ich fabe mehrere Straßen gefunden: ",
      "PRECISE": " Welche davon ist die richtige ",
      "DIDNT_GET_IT_MESSAGE": " Entschuldigung, das habe ich leider nicht verstanden ",
      "SETUP_NOT_COMPLETE": " Bevor ich dir helfen kann, muss ich noch einige Informationen über dich wissen. ",
      "NO_CITIES_FOUND": " Ich habe leider keine Stadt mit diesem Namen gefunden. Versuche es noch einmal.",
      "NO_STREETS_FOUND": " Ich habe leider keine Straße mit diesem Namen gefunden. Versuche es noch einmal.",
      "SETUP_DONE_MESSAGE": " Jetzt weiss ich alles was ich wissen muss. Du kannst mich jetzt jeder Zeit nach den nächsten Abfuhrterminen für deinen Bezirk fragen. ",
      "IN": " in ",
      "FOR": " für ",
      "IS": " ist ",
      "ON": " am ",
      "WASTE_TYPE_BIO": " Biomüll ",
      "WASTE_TYPE_PAPER": " Papier ",
      "WASTE_TYPE_RECYCLING": " Gelber Sack ",
      "WASTE_TYPE_REST": " Restmüll ",
      "WASTE_TYPE_REST_2": " Restmüll, 2-wöchentlich ",
      "WASTE_TYPE_REST_4": " Restmüll, 4-wöchentlich ",
      "HELP_REPROMPT": " Du kannst nach dem nächsten Abfuhrtermin für eine Müllsorte fragen. ",
      "HELP_MESSAGE": " Was möchtest du wissen? ",
      "STOP_MESSAGE": " Auf Wiedersehen! ",
      "SETUP_CITY_MESSAGE": " Zuerst muss ich wissen wo du wohnst. ",
      "SETUP_CITY_QUESTION": " Sage mir zuerst den Namen deiner Stadt. ",
      "SETUP_STREET_QUESTION": " In welcher Straße wohnst du? ",
      "NEXT_DATE_OF_TYPE_MESSAGE": " Das nächste mal ",
      "IS_ON_MESSAGE": " ist am ",
      "NO_DATES_TOMORROW_MESSAGE": " Morgen findet keine Abholung statt. ",
      "TOMORROW_MESSAGE": " Morgen werden folgende Müllarten abgeholt: ",
      "TOMORROW_SINGLE_MESSAGE_1": " Morgen wird ",
      "TOMORROW_SINGLE_MESSAGE_2": " abgeholt. ",
      "DATE_SEPERATOR": ".",
      "P": " Papiermüll ",
      "G": " Gelber Sack ",
      "B": " Biomüll ",
      "R2": " Restmüll, 2-wächentlich ",
      "R4": " Restmüll, 4-wöchentlich ",
      "MONTH_0": " Januar ",
      "MONTH_1": " Februar ",
      "MONTH_2": " März ",
      "MONTH_3": " April ",
      "MONTH_4": " Mai ",
      "MONTH_5": " Juni ",
      "MONTH_6": " Juli ",
      "MONTH_7": " August ",
      "MONTH_8": " September ",
      "MONTH_9": " Oktober ",
      "MONTH_10": " November ",
      "MONTH_11": " Dezember ",
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
  alexa.resources = languageStrings;
  alexa.dynamoDBTableName = 'awbes-date-users';
  alexa.registerHandlers(newSessionHandlers, setupCityHandler,
    setupStreetHandler, dateHandler);
  alexa.execute();
};

var newSessionHandlers = {
  'NewSession': function() {
    this.emit(':tell', this.t('WELCOME_MESSAGE'));
    if (!this.attributes['city']) {
      this.handler.state = states.CITY_MODE;
      this.emitWithState('PromptCityInput');
    } else if (!this.attributes['street']) {
      this.handler.state = states.STREET_MODE;
      this.emitWithState('PromptStreetInput');
    } else {
      this.handler.state = states.READY_MODE;
      this.emit(':ask', this.t('HELP_MESSAGE'), this.t('HELP_REPROMPT'));
    }
  },
  'NextDatesIntent': function() {
    if (!this.attributes['city']) {
      this.handler.state = states.CITY_MODE;
      this.emit(':tell', this.t('SETUP_NOT_COMPLETE'));
      this.emitWithState('PromptCityInput');
    } else if (!this.attributes['street']) {
      this.handler.state = states.STREET_MODE;
      this.emitWithState('PromptStreetInput');
    } else {
      this.handler.state = states.READY_MODE;
      this.emitWithState('NextDatesIntent');
    }
  },
  "AMAZON.StopIntent": function() {
    this.emit(':tell', this.t('STOP_MESSAGE'));
  },
  "AMAZON.CancelIntent": function() {
    this.emit(':tell', this.t('STOP_MESSAGE'));
  },
  'SessionEndedRequest': function() {
    console.log('session ended!');
    this.emit(":tell", this.t('STOP_MESSAGE'));
  }
};

var setupCityHandler = Alexa.CreateStateHandler(states.CITY_MODE, {
  'NewSession': function() {
    this.handler.state = '';
    this.emitWithState('NewSession'); // Uses the handler in newSessionHandlers
  },
  'PromptCityInput': function() {
    this.emit(':ask',
      this.t('SETUP_NOT_COMPLETE') +
      this.t('SETUP_CITY_MESSAGE') +
      this.t('SETUP_CITY_QUESTION'));
  },
  'SetStreetIntent': function() {
    //the amazon SR isn't really good at differntiating the two intents.
    // just forward them to one another
    this.event.request.intent.slots.city =
      this.event.request.intent.slots.street;
    this.emitWithState('SetCityIntent');
  },
  'SetCityIntent': function() {
    let cityInput = this.event.request.intent.slots.city.value;
    dateHelper.getDistrictCities(cityInput)
      .then((foundCities) => {
        if (foundCities.length == 1) {
          this.attributes['city'] = foundCities[0];
          this.handler.state = states.STREET_MODE;
          this.emit(':ask',
            this.t('CITY_SAVED_MESSAGE_1') +
            foundCities[0] +
            this.t('CITY_SAVED_MESSAGE_2') +
            this.t('SETUP_STREET_QUESTION'));
          //this.emitWithState('PromptStreetInput');
        } else if (foundCities.length > 1) {
          this.emit(':ask',
            this.t('FOUND_MULTIPLE_CITIES') +
            foundCities.join(',') +
            this.t('PRECISE'));
        } else {
          this.emit(':tell', this.t('NO_CITIES_FOUND'));
        }
      })
      .catch((e) => {
        console.error(e);
        this.emit(':tell', this.t('ERROR'));
      })
  }
});

var setupStreetHandler = Alexa.CreateStateHandler(states.STREET_MODE, {
  'NewSession': function() {
    this.handler.state = '';
    this.emitWithState('NewSession'); // Uses the handler in newSessionHandlers
  },
  'PromptStreetInput': function() {
    this.emit(':ask',
      this.t('SETUP_NOT_COMPLETE') +
      this.t('SETUP_STREET_QUESTION')
    );
  },
  'SetCityIntent': function() {
    //the amazon SR isn't really good at differntiating the two intents.
    // just forward them to one another
    this.event.request.intent.slots.street =
      this.event.request.intent.slots.city;
    this.emitWithState('SetStreetIntent');
  },
  'SetStreetIntent': function() {
    let streetInput = this.event.request.intent.slots.street.value;
    let city = this.attributes['city'];
    dateHelper.getDistrictStreets(city, streetInput)
      .then((foundStreets) => {
        if (foundStreets.length == 1) {
          this.attributes['street'] = foundStreets[0];
          this.handler.state = states.READY_MODE;
          this.emit(':tell', this.t('STREET_SAVED_MESSAGE_1') +
            foundStreets[0] +
            this.t('STREET_SAVED_MESSAGE_2') +
            this.t('SETUP_DONE_MESSAGE'));
        } else if (foundStreets.length > 1) {
          this.emit(':ask',
            this.t('FOUND_MULTIPLE_STREETS') +
            foundStreets.join(',') +
            this.t('PRECISE'));
        } else {
          this.emit(':tell', this.t('NO_STREETS_FOUND'));
        }
      })
      .catch((e) => {
        console.error(e);
        this.emit(':tell', this.t('ERROR'));
      })
  }
});

var dateHandler = Alexa.CreateStateHandler(states.READY_MODE, {
  /*'NewSession': function() {
    this.emitWithState('NextDatesIntent');
  },*/
  'NextDateIntent': function() {
    let type = dateHelper.keyForType(
      this.event.request.intent.slots.type.value);
    let typeName = this.event.request.intent.slots.type.value;
    let street = this.attributes['street'];
    let city = this.attributes['city'];
    dateHelper.getNextDateForType(city, street, type)
      .then((date) => {
        let message = this.t('NEXT_DATE_OF_TYPE_MESSAGE') +
          typeName +
          this.t('IS_ON_MESSAGE') +
          this.t(date.date.getDay()) +
          this.t('DATE_SEPERATOR') +
          this.t('MONTH_' + date.date.getMonth());

        this.emit(':tell', message)
      });
  },
  'NextDatesIntent': function() {
    let street = this.attributes['street'];
    let city = this.attributes['city'];
    dateHelper.getAllNextDates(city, street)
      .then((dates) => {
        let message = this.t('NEXT_DATES_IN_DISTRICT_MESSAGE') +
          this.attributes['city'] +
          ', ' +
          this.attributes['street'] +
          ': ';

        dates.forEach((date) => {
          message +=
            this.t(date.type) +
            this.t('IS_ON_MESSAGE') +
            this.t(date.date.getDay()) +
            this.t('DATE_SEPERATOR') +
            this.t('MONTH_' + date.date.getMonth());
        });

        this.emit(':tell', message);
      });
  },
  'TomorrowIntent': function() {
    let street = this.attributes['street'];
    let city = this.attributes['city'];
    dateHelper.getTypesOfTomorrow(city, street)
      .then((dates) => {
        if (dates.length == 0) {
          this.emit(':tell', this.t('NO_DATES_TOMORROW_MESSAGE'));
        } else if (dates.length == 1) {
          this.emit(':tell',
            this.t('TOMORROW_SINGLE_MESSAGE_1') +
            this.t(dates[0].type) +
            this.t('TOMORROW_SINGLE_MESSAGE_2')
          )
        } else {
          let message = this.t('TOMORROW_MESSAGE');
          dates.forEach((date) => {
            message +=
              this.t(date.type) +
              ', '
          });

          this.emit(':tell', message);
        }
      });
  },
  'Unhandled': function() {
    this.emit(':tell', this.t('DIDNT_GET_IT_MESSAGE'));
  }
});
