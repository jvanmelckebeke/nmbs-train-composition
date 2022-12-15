//#region custom type definitions

/**
 * @typedef {Object} EndStop
 * @property {string} place - the name of the stop
 * @property {string} time - the time the trip arrives at the stop (HH:MM)
 *
 * @typedef {Object} EndPointDefinition - the definition of an endpoint of a trip
 * @property {string} start - the name of the start stop
 * @property {string} end - the name of the end stop
 *
 * @typedef {Object} Wagon
 * @property {string} name - the textual name of the wagon (e.g. 'M5 BDx')
 * @property {string} identifier - the identifier of the wagon (e.g. 'm5bdxr_1')
 * @property {string} img - the path to the image of the wagon
 * @property {string} company - the name of the company that uses the wagon
 * @property {EndPointDefinition} endpoints - the start and end stops of the wagon
 *
 * @typedef {Object} Composition
 * @property {string} condition - the periods the composition is valid ('Touristic', 'Holiday', 'General')
 * @property {Wagon[]} composition - the wagons in the composition
 *
 * @typedef {Object} Trip
 * @property {number} accuracy - the accuracy of the trip (0 - 5)
 * @property {string[]} days - the days this trip is active
 * @property {string[]} stops - the stops this trip makes (including endpoints)
 * @property {EndStop} start - the start stop of the trip
 * @property {EndStop} end - the end stop of the trip
 * @property {Composition[]} compositions - the possible compositions of this trip
 *
 *
 * @typedef {Object} Line
 * @property {string} identifier - the identifier of the line (e.g. IC 3306)
 * @property {string} number - the number of the line (e.g. 3306)
 * @property {string} category - the category of the line (e.g. IC)
 * @property {string} start - the start station of the line
 * @property {string} end - the end station of the line
 * @property {Trip[]} trips - the trips of the line
 */

//#endregion

//#region global vars

let lineSearchElement;
let lineFormElement;
let lineSearchResultsElement;
let daySelectElement;
let periodSelectElement;

let activeLine = null;
let activeTrip = null;

const API_URL = 'http://composition.jarivanmelckebeke.be';
//#endregion

//#region utils

/**
 * normalizes a stop name
 *
 * for example: 'Bruxelles-Midi/Brussel-Zuid' becomes 'Brussel-Zuid'
 *
 * @param {string} stop
 * @returns {string}
 */
const normalizeStop = function (stop) {
    let stopName = stop;
    if (!stop) {
        console.log('No stop name');
        return '';
    }
    if (stop.includes('/')) {
        // set stopName to the second part of the string (e.g. the Dutch name)
        stopName = stopName.split('/')[1];
    }
    return stopName;
}

/**
 * checks if a trip should be shown based on the selected day and period
 * @param trip
 * @returns {boolean} true if the trip should be shown, false otherwise
 */
const checkShouldShowTrip = function (trip) {
    const activeDays = trip.days.map(day => day.toLowerCase());
    if (activeDays.indexOf(daySelectElement.value) === -1) {
        return false;
    }
    // todo: check if holiday and touristic period
    return true;
}

//#endregion

//#region event listeners
/**
 * handles a search click
 * @param {Event} event
 */
const handleFormSearchSubmit = function (event) {
    event.preventDefault();
    const lineSearchValue = lineSearchElement.value;
    loadLine(lineSearchValue);
    document.activeElement.blur();
}
//#endregion

//#region api handlers
/**
 * checks the periods that a trip is active in and generates the period select
 * @param trip - the trip to check
 */
const checkCompatiblePeriods = function (trip) {
    const compatiblePeriods = ["all"];
    console.log(trip);
    for (const composition of trip.compositions) {
        compatiblePeriods.push(composition.condition);
    }

    const periodSelect = document.querySelector('.js-period-select');
    for (const option of periodSelect.options) {
        option.disabled = compatiblePeriods.indexOf(option.value) === -1;
    }

    if (compatiblePeriods.indexOf(periodSelect.value) === -1) {
        periodSelect.value = "all";
    }
}

/**
 * checks the days that a line is active in and generates the day select
 * @param line
 */
const checkCompatibleDays = function (line) {
    const compatibleDays = [];
    for (const trip of line.trips) {
        for (const day of trip.days) {
            compatibleDays.push(day.toLowerCase());
        }
    }

    const daySelect = document.querySelector('.js-day-select');
    for (const option of daySelect.options) {
        option.disabled = compatibleDays.indexOf(option.value) === -1;
    }

    if (compatibleDays.indexOf(daySelect.value) === -1) {
        daySelect.value = compatibleDays[0];
    }
}

//#endregion

//#region html generation
/**
 * generates the html for a line
 * @param line
 */
const htmlShowLine = function (line) {
    checkCompatibleDays(line);
    let tripHtml = "";
    for (const trip of line.trips) {
        if (checkShouldShowTrip(trip)) {
            tripHtml += htmlGenerateTrip(trip);
        }
    }


    lineSearchResultsElement.innerHTML = `
    <div class="c-result">
        <div class="c-result__header">
            ${htmlGenerateLineHeader(line)}
        </div>
        ${tripHtml}
    </div>`;
    htmlGenerateAccuracyChart();
    if (!activeLine) {
        htmlSetDaySelect();
    }
    activeLine = line;
}

/**
 * handles the html if no line is found
 */
const htmlShowNoResults = function () {
    deactivateContainer('.js-day');
    activateContainer('.js-search-results');
    toggleClass('.js-search-results', 'c-container__results--empty', true);
    lineSearchResultsElement.innerHTML = `
        <p class="c-text c-text__no-results">
            No Lines Found
       </p>`;
}

/**
 * sets the day select to today or the first day that is active, also adds event listeners
 */
const htmlSetDaySelect = function () {
    // get day of the week lowercase
    const day = new Date().toLocaleString('en-us', {weekday: 'long'}).toLowerCase();
    const daySelect = document.querySelector('.js-day-select');
    daySelect.value = day;

    // also add day event listener
    daySelect.addEventListener('change', onDaySelect);
    periodSelectElement.addEventListener('change', onPeriodSelect);
}

/**
 * generates the html for the accuracy chart
 */
const htmlGenerateAccuracyChart = function () {
    const containers = document.querySelectorAll('.js-accuracy');
    for (const container of containers) {
        const target = container.querySelector('.js-gauge');
        const textTarget = container.querySelector('.js-helpertext');
        let accuracy = target.dataset.accuracy;
        accuracy = Math.round(accuracy / 5 * 100);
        let opts = {
            angle: 0,                   // The span of the gauge arc
            lineWidth: 0.1,             // The line thickness
            radiusScale: 1,             // Relative radius
            pointer: {
                length: 0,              // Relative to gauge radius
                strokeWidth: 0,         // The thickness
                color: '#000000'        // Fill color
            }, limitMax: false,            // If false, max value increases automatically if value > maxValue
            limitMin: false,            // If true, the min value of the gauge will be fixed
            colorStart: '#58FCAD',      // original: #6F6EA0
            colorStop: '#32de8a',       // original: #C0C0DB
            strokeColor: '#eee',        // original: #EEEEEE
            generateGradient: true, highDpiSupport: true
        };
        const gauge = new Donut(target).setOptions(opts);
        gauge.setTextField(textTarget);
        gauge.maxValue = 100;
        gauge.setMinValue(0);
        gauge.animationSpeed = 32;
        gauge.set(accuracy);
    }


}

/**
 * generates the header html for a line
 * @param line - the line to generate the header for
 * @returns {string} - the html for the line header
 */
const htmlGenerateLineHeader = function (line) {
    return `<h1 class="c-line-title js-line-title">${line.identifier}</h1>`;
}

/**
 * generates the html for a wagon
 * @param wagon
 * @returns {string} - the html for the wagon
 */
const htmlGenerateWagon = function (wagon) {
    return `<div class="c-wagons-table__item">
                <img class="c-wagon__info c-wagon__image" src="${API_URL}${wagon.img}" 
                                            alt="${wagon.identifier} produced by ${wagon.company}">
                <span class="c-wagon__info c-wagon__text c-wagon__name">${wagon.name}</span>
                <span class="c-wagon__info c-wagon__text c-wagon__from">${wagon.endpoints.start}</span>
                <span class="c-wagon__info c-wagon__text c-wagon__to">${wagon.endpoints.end}</span>
            </div>`;
}

/**
 * generates the html for a composition
 * @param composition
 * @returns {string}
 */
const htmlGenerateComposition = function (composition) {
    let condition = composition.condition;
    if (condition === 'General') {
        condition = 'Normal Service';
    }
    return `<div class="c-trip__composition">
                <h2 class="c-trip__active-condition">${condition}</h2>
                <div class="c-wagons-table">
                    ${composition.composition.map(htmlGenerateWagon).join('')}
                </div>
            </div>`;
}

/**
 * generates the html for a stop
 * @param stop
 * @returns {string}
 */
const htmlGenerateStop = function (stop) {
    let stopName = normalizeStop(stop);
    if (stopName)
        return `<li class="c-line-stops__item"><span class="c-line-stops__symbol"></span>${stopName}</li>`
    return '';
}


/**
 * generates the html for a trip
 * @param trip
 * @returns {string}
 */
const htmlGenerateTrip = function (trip) {
    activeTrip = trip;
    checkCompatiblePeriods(trip);
    const amountOfStops = trip.stops.length;
    let stopHtml = htmlGenerateStop(trip.stops[0]);
    if (amountOfStops > 2) {
        const inbetweenStopsText = `${amountOfStops - 2} stops`;
        stopHtml += htmlGenerateStop(inbetweenStopsText);
    }
    stopHtml += htmlGenerateStop(trip.stops[amountOfStops - 1]);

    let compositionHtml = "";
    for (const composition of trip.compositions) {
        let selectedPeriod = periodSelectElement.value;

        if (selectedPeriod !== 'all') {
            if (composition.condition !== selectedPeriod) {
                console.log(composition.condition, selectedPeriod);
                continue;
            }
        }
        compositionHtml += htmlGenerateComposition(composition);
    }

    return `
    <div class="c-trip">
        <div class="c-trip__header">
            <ul class="c-line-stops">
                ${stopHtml}
            </ul>
            <div class="c-trip__accuracy js-accuracy">
                <h2 class="c-trip__accuracy-title">Accuracy</h2>
                <canvas class="c-trip__accuracy-gauge js-gauge" data-accuracy="${trip.accuracy}"></canvas>
                <div class="c-trip__accuracy-text js-helpertext">${trip.accuracy}</div>
            </div>
        </div>
        <div class="c-trip__body">
            ${compositionHtml}
        </div>
    </div>`;
}
//#endregion

//#region css tools
/**
 * sets the '--search-active' css modifier to the `.js-header` element,
 * making the search element become smaller
 *
 * @param {boolean} active - whether there is content in the results container
 */
const setResultsActive = function (active) {
    // console.log('setResultsActive', active);
    toggleClass('.js-header', 'c-container__header--search-active', active);
}

/**
 * activates a container by removing the `--dead` and/or '--hidden' css modifiers
 * @param {string} querySelector - the query selector of the container
 */
const activateContainer = function (querySelector) {
    const element = document.querySelector(querySelector);
    if (!element) {
        return;
    }
    if (element.classList.contains('c-container--dead')) {
        if (!element.classList.contains('c-container--hidden')) {
            element.classList.add('c-container--hidden');
        }
        element.classList.remove('c-container--dead');
        element.classList.add('c-container--alive');
        setTimeout(function () {
            element.classList.remove('c-container--hidden');
        }, 100); // this gives time for the display block to load into html
    }
    if (element.classList.contains('c-container--hidden')) {
        element.classList.remove('c-container--hidden');
    }
}

/**
 * deactivates a container by adding the '--hidden' css modifiers
 * @param {string} querySelector - the query selector of the container
 */
const deactivateContainer = function (querySelector) {
    const element = document.querySelector(querySelector);
    if (!element) {
        return;
    }
    if (element.classList.contains('c-container--alive')) {
        element.classList.add('c-container--hidden');
    }
}

/**
 * toggles a css class on the element
 * @param {string} querySelector - the query selector of the element
 * @param {string} className - the name of the class to toggle
 * @param {boolean} shouldBeActive - whether the class should be active
 */
const toggleClass = function (querySelector, className, shouldBeActive) {
    if (className.startsWith('.')) {
        console.warn("className should not start with a '.'");
    }

    const element = document.querySelector(querySelector);
    if (!element || (element.classList.contains(className) == shouldBeActive)) {
        console.log("RETURNING")
        return;
    }
    if (shouldBeActive && !element.classList.contains(className)) {
        element.classList.add(className);
        console.log("ADDING")
    } else {
        element.classList.remove(className);
        console.log("REMOVING")
    }
}

/**
 * activates the search results container
 */
const activateResults = function () {
    activateContainer('.js-search-results');
    activateContainer('.js-day');
    activateContainer('.js-page');
    setResultsActive(true);
}

/**
 * activates the warning that multiple compositions are possible
 */
const activateMultipleCompositionsWarning = function () {
    console.log('activateMultipleCompositionsWarning');
    activateContainer('.js-warning');
}

/**
 * deactivates the warning that multiple compositions are possible
 */
const hideMultipleCompositionsWarning = function () {
    console.log('hideMultipleCompositionsWarning');
    deactivateContainer('.js-warning');
}

/**
 * deactivates the search results container
 */
const hideResults = function () {
    deactivateContainer('.js-search-results');
    deactivateContainer('.js-warning');
    // deactivateContainer('.js-day');
    // don't deactivate day, because it's not needed
    deactivateContainer('.js-page');
}


const showLoading = function () {
    setResultsActive(true);
    activateContainer('.js-loading');
}

const hideLoading = function () {
    deactivateContainer('.js-loading');
}

//#endregion


function checkShouldWarn(data) {
    if (data.trips.length > 0) {
        activateMultipleCompositionsWarning();
        return;
    }

    for (const trip of data.trips) {
        if (trip.compositions.length > 1) {
            activateMultipleCompositionsWarning();
            return;
        }
    }

    hideMultipleCompositionsWarning();
}

//#region event handlers
const fetchLine = function (line) {
    fetch(`${API_URL}/line/${line}`)
        .then(response => response.json()).then(data => {
        if (!data) {
            // no results were found
            console.log("no results")
            htmlShowNoResults();
        } else {
            console.log(data);
            deactivateContainer('.js-no-results');
            checkShouldWarn(data);
            htmlShowLine(data);
            setTimeout(activateResults, 100);
        }
        hideLoading();
    });
}

const loadLine = function (line) {
    hideResults();
    showLoading();
    console.log('loading');

    fetchLine(line);

}

/**
 *
 * @param event
 */
const onDaySelect = function (event) {
    if (activeLine) {
        htmlShowLine(activeLine);
    }
}

const onPeriodSelect = function (event) {
    if (activeLine) {
        htmlShowLine(activeLine);
    }
}
//#endregion

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded');

    lineSearchElement = document.querySelector(".js-line-search");
    lineFormElement = document.querySelector(".js-form-line");
    lineSearchResultsElement = document.querySelector(".js-search-results");
    daySelectElement = document.querySelector(".js-day-select");
    periodSelectElement = document.querySelector(".js-period-select");

    lineFormElement.addEventListener('submit', handleFormSearchSubmit);

});
