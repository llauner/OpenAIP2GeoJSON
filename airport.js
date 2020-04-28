var colors		= require('colors/safe'),
	GeoJSON		= require('geojson');

var runways	= [];
var airports = [];

exports.doAirports = function(inputData, block){
    var airportList = inputData.OPENAIP.WAYPOINTS[0].AIRPORT;
    for(var a = 0; a < airportList.length; a++){
        var tempAirport = airportList[a];
        var airport = {
            guid:       "",
            aeronautical : "airport",
            name:       tempAirport.NAME[0],
            type:       tempAirport.$.TYPE,
            country:    tempAirport.COUNTRY[0],
            icao :      (tempAirport.ICAO != undefined ) ? tempAirport.ICAO[0] : "",
            radios:     [],
            latitude :  parseFloat(tempAirport.GEOLOCATION[0].LAT[0]),
            longitude : parseFloat(tempAirport.GEOLOCATION[0].LON[0]),
            elev :      parseFloat(tempAirport.GEOLOCATION[0].ELEV[0]._)
        };
        // Work on radios
        if(tempAirport.RADIO != undefined){
            for(var r = 0; r < tempAirport.RADIO.length; r++){
                var tempRadio = tempAirport.RADIO[r];
                var radio = {
                    category: tempRadio.$.CATEGORY,
                    frequency: parseFloat(tempRadio.FREQUENCY[0]),
                    type: tempRadio.TYPE[0],
                    spec: (tempRadio.TYPESPEC != undefined ) ? tempRadio.TYPESPEC[0] : "",
                    description: (tempRadio.DESCRIPTION != undefined) ? tempRadio.DESCRIPTION[0] : ""
                };
                airport.radios.push(radio);
            }
        }
        // Work on runways
        if(tempAirport.RWY != undefined){
            for(var r = 0; r < tempAirport.RWY.length; r++){
                var tempRnw = tempAirport.RWY[r];
                var rnw = {
                    guid:       "",
                    aeronautical : "runway",
                    operations : tempRnw.$.OPERATIONS,
                    airport : airport.name,
                    name : tempRnw.NAME[0],
                    sfc : tempRnw.SFC[0],
                    latitude :  airport.latitude,
                    longitude : airport.longitude,
                    elev :      airport.elev,
                    length : parseFloat(tempRnw.LENGTH[0]._),
                    width : parseFloat(tempRnw.WIDTH[0]._),
                    directions: []
                };
                if( tempRnw.DIRECTION != undefined ){
                    for(var z = 0; z < tempRnw.DIRECTION.length; z++){
                        rnw.directions.push(tempRnw.DIRECTION[z].$.TC);
                    }
                }
                runways.push(rnw);
            }
        }
        airports.push(airport);
    }
	console.log(colors.yellow(">>> DONE : "+ airports.length + " airports"));
	return airports;
}

exports.getAirportsAsGeoJson = function(airports) {
	var geoData = GeoJSON.parse(airports, {Point:['latitude','longitude']});
	return geoData;
}