let lineSearchElement;
let lineFormElement;
let lineSearchResultsElement;
let daySelectElement;
let isHolidayElement;
let isTouristicPeriodElement;

let activeLine = null;

const API_URL = 'http://composition.jarivanmelckebeke.be';

//#region utils

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

const checkShouldShowTrip = function (trip) {
    const activeDays = trip.days.map(day => day.toLowerCase());
    if (activeDays.indexOf(daySelectElement.value) === -1) {
        return false;
    }
    return true;
}

//#endregion

//#region html generation
const htmlShowLine = function (data) {
    let tripHtml = "";
    for (const trip of data.trips) {
        if (checkShouldShowTrip(trip)) {
            tripHtml += htmlGenerateTrip(trip);
        }
    }
    lineSearchResultsElement.innerHTML = `
    <div class="c-result">
        <div class="c-result__header">
            ${htmlGenerateLineHeader(data)}
        </div>
        ${tripHtml}
    </div>`;
    htmlGenerateAccuracyCharts();
}

const htmlGenerateAccuracyCharts = function () {
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
            },
            limitMax: false,            // If false, max value increases automatically if value > maxValue
            limitMin: false,            // If true, the min value of the gauge will be fixed
            colorStart: '#58FCAD',      // original: #6F6EA0
            colorStop: '#32de8a',       // original: #C0C0DB
            strokeColor: '#eee',        // original: #EEEEEE
            generateGradient: true,
            highDpiSupport: true
        };
        const gauge = new Donut(target).setOptions(opts);
        gauge.setTextField(textTarget);
        gauge.maxValue = 100;
        gauge.setMinValue(0);
        gauge.animationSpeed = 32;
        gauge.set(accuracy);
    }


}

const htmlGenerateLineHeader = function (data) {
    return `<h1 class="c-line-title">${data.identifier}</h1>`;
}

const htmlGenerateWagon = function (wagon) {
    return `<div class="c-wagons-table__item">
                <img class="c-wagon__image" src="${API_URL}${wagon.img}" 
                                            alt="${wagon.identifier} produced by ${wagon.company}">
                <span class="c-wagon__from">${wagon.endpoints.start}</span>
                <span class="c-wagon__to">${wagon.endpoints.end}</span>
            </div>`;
}

const htmlGenerateComposition = function (composition) {
    return `<div class="c-trip__composition">
                <h2 class="c-trip__active-condition">${composition.condition}</h2>
                <div class="c-wagons-table">
                    ${composition.composition.map(htmlGenerateWagon).join('')}
                </div>
            </div>`;
}
const htmlGenerateStop = function (stop) {
    let stopName = normalizeStop(stop);
    if (stopName)
        return `<li class="c-line-stops__item">${stopName}</li>`
    return '';
}


const htmlGenerateTrip = function (trip) {
    const amountOfStops = trip.stops.length;
    let stopHtml = htmlGenerateStop(trip.stops[0]);
    if (amountOfStops > 2) {
        const inbetweenStopsText = `${amountOfStops - 2} stops`;
        stopHtml += htmlGenerateStop(inbetweenStopsText);
    }
    stopHtml += htmlGenerateStop(trip.stops[amountOfStops - 1]);

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
            ${trip.compositions.map(htmlGenerateComposition).join('')}
        </div>
    </div>`;
}
//#endregion

//#region css tools
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

const deactivateContainer = function (querySelector) {
    const element = document.querySelector(querySelector);
    if (!element) {
        return;
    }
    if (element.classList.contains('c-container--alive')) {
        element.classList.add('c-container--hidden');
    }
}

const activateResults = function () {
    activateContainer('.js-search-results');
    activateContainer('.js-day');
    activateContainer('.js-page');
}

const hideResults = function () {
    deactivateContainer('.js-search-results');
    // deactivateContainer('.js-day');
    // don't deactivate day, because it's not needed
    deactivateContainer('.js-page');
}
//#endregion

const handleFormSearchSubmit = function (event) {
    event.preventDefault();
    const lineSearchValue = lineSearchElement.value;
    loadLine(lineSearchValue);
}

const loadLine = function (line) {
    hideResults();
    // example 3639
    fetch(`${API_URL}/line/${line}`)
        .then(response => response.json())
        .then(data => {
            activeLine = data;
            console.log(data);
            htmlShowLine(data);
        });
    activateResults();
}


document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded');

    lineSearchElement = document.querySelector(".js-line-search");
    lineFormElement = document.querySelector(".js-form-line");
    lineSearchResultsElement = document.querySelector(".js-search-results");
    daySelectElement = document.querySelector(".js-day-select");
    isHolidayElement = document.querySelector(".js-holiday");
    isTouristicPeriodElement = document.querySelector(".js-touristic-period");

    lineFormElement.addEventListener('submit', handleFormSearchSubmit);
});
