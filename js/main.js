let lineSearchElement;
let lineFormElement;
let lineSearchResultsElement;
let daySelectElement;
let isHolidayElement;
let isTouristicPeriodElement;

let activeLine = null;

const API_URL = 'http://composition.jarivanmelckebeke.be';

const handleFormSearchSubmit = function (event) {
    event.preventDefault();
    console.log('Form submitted');
    const lineSearchValue = lineSearchElement.value;
    loadLine(lineSearchValue);
}

const htmlGenerateLineHeader = function (data) {
    return `
        <h1 class="c-line-title">${data.identifier}</h1>
    `;
}

const htmlGenerateTrip = function (trip) {
    // first check if this trip should be shown
    const activeDays = trip.days.map(day => day.toLowerCase());
    if (activeDays.indexOf(daySelectElement.value) === -1) {
        return '';
    }

    const htmlGenerateActiveDay = function (day) {

        return `<li class="c-trip-days-active__item">${day}</li>`;
    }

    const htmlGenerateComposition = function (composition) {
        const htmlGenerateWagon = function (wagon) {
            return `
                <div class="c-wagons-table__item">
                    <img class="c-wagon__image" src="${API_URL}${wagon.img}" alt="${wagon.identifier} produced by ${wagon.company}">
                    <span class="c-wagon__from">${wagon.endpoints.start}</span>
                    <span class="c-wagon__to">${wagon.endpoints.end}</span>
                </div>`;
        }

        switch (composition.condition) {
            case 'General':
                if (isHolidayElement.checked || isTouristicPeriodElement.checked) {
                    return '';
                }
                break;
            case 'During the period of annual holidays':
                if (!isHolidayElement.checked) {
                    return '';
                }
                break;
            case 'During the touristic period':
                if (!isTouristicPeriodElement.checked) {
                    return '';
                }
                if (isHolidayElement.checked) {
                    return '';
                }
                break;
        }

        return `
            <div class="c-trip-composition">
                <h2 class="c-trip-active-condition">${composition.condition}</h2>
                    <div class="c-wagons-table">
                        ${composition.composition.map(htmlGenerateWagon).join('')}
                    </div>
            </div>`;
    }
    const htmlGenerateStop = function (stop) {
        let stopName = stop;
        if (!stop) {
            console.log('No stop name');
            return '';
        }
        if (stop.includes('/')) {
            // set stopName to the second part of the string
            stopName = stopName.split('/')[1];
        }
        return `<li class="c-line-stops__item">${stopName}</li>`
    }


    const amountOfStops = trip.stops.length;
    const inbetweenStopsText = `${amountOfStops - 2} stops`;
    let inbetweenHtml = "";
    if (amountOfStops > 2) {
        inbetweenHtml = `<span class="c-trip__inbetween">${inbetweenStopsText}</span>`;
    }
    const result = `
    <div class="c-trip">
        <div class="c-trip__header">
            <span class="c-trip__accuracy">Accuracy: ${trip.accuracy}</span>
            <div class="c-trip__days-active">
                <ul class="c-line-stops">
                    ${htmlGenerateStop(trip.stops[0])}
                    ${htmlGenerateStop(inbetweenStopsText)}
                    ${htmlGenerateStop(trip.stops[trip.stops.length - 1])}
                </ul>
            </div>
        </div>
        <div class="c-trip__body">
            ${trip.compositions.map(htmlGenerateComposition).join('')}
        </div>
    </div>
    `;
    return result;
}

const htmlShowLine = function (data) {
    const updateResultClass = function () {
        document.querySelector('.js-search-results').classList.toggle("c-container-results__active");
        document.querySelector('.js-day').classList.toggle("c-container-day__active");
        document.querySelector('.js-header').classList.toggle("c-container--header__active");
        document.querySelector('.js-page').classList.toggle("c-page__active");
    }
    const result = `
    <div class="c-result">
        <div class="c-result__header">
            ${htmlGenerateLineHeader(data)}
        </div>
        ${data.trips.map(htmlGenerateTrip).join('')}
    </div>
</div>`;
    lineSearchResultsElement.innerHTML = result;
    setTimeout(updateResultClass, 200);
}

const loadLine = function (line) {
    console.log('Loading line', line);
    // example 3639
    fetch(`${API_URL}/line/${line}`)
        .then(response => response.json())
        .then(data => {
            activeLine = data;
            console.log(data);
            htmlShowLine(data);
        });
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
