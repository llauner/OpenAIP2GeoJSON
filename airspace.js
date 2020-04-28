var colors		= require('colors/safe'),
	GeoJSON		= require('geojson');

var airspaces	= [];

exports.doAirspaces = function(inputData){
    console.log(colors.green("Transforming Openaip data to Geojson: Count = " + inputData.OPENAIP.AIRSPACES[0].ASP.length));
    var airspacesList = inputData.OPENAIP.AIRSPACES[0].ASP;
    for(var a = 0; a < airspacesList.length; a ++){
        var tempAirspace = airspacesList[a];
        var airspace = {
            guid:       "",
            aeronautical : "airspace",
            category:   tempAirspace.$.CATEGORY,
            version:    tempAirspace.VERSION[0],
            id:         tempAirspace.ID[0],
            country:    tempAirspace.COUNTRY[0],
            name:       tempAirspace.NAME[0],
            alt_limits:{
                top:{
                    ref:tempAirspace.ALTLIMIT_TOP[0].$.REFERENCE,
                    value: tempAirspace.ALTLIMIT_TOP[0].ALT[0].$.UNIT +" "+ tempAirspace.ALTLIMIT_TOP[0].ALT[0]._
                },
                bottom:{
                    ref:tempAirspace.ALTLIMIT_BOTTOM[0].$.REFERENCE,
                    value:tempAirspace.ALTLIMIT_BOTTOM[0].ALT[0].$.UNIT +" "+ tempAirspace.ALTLIMIT_BOTTOM[0].ALT[0]._
                }
            },
            geometry:[]
        };

        // Generate vertexes for airspaces geometry
        // A GeoJSON polygon is polygon : [ [ [Coordinates 1] ] ]
        var strGeomArr = tempAirspace.GEOMETRY[0].POLYGON[0].split(', ');
        var vertexes = [];
        for(var g = 0; g < strGeomArr.length; g++){
            var tmpVertex = strGeomArr[g].split(" ");
            var vertex = [ parseFloat(tmpVertex[0]), parseFloat(tmpVertex[1])];
            vertexes.push(vertex);
        }
        airspace.geometry = [ vertexes ];

        // --- Filter out so that we don't add the same airspace twice ---
        // HACK: no idea why I have to check this. Doesn't happen locally, but always happens when executed from gcloud
        var isAlreadyInserted = airspaces.some(a => _.isEqual(a, airspace));
        if (!isAlreadyInserted)
            airspaces.push(airspace);
    }
    console.log(colors.yellow("DONE : "+ airspaces.length + " airspaces"));
    return airspaces;
}

exports.getAirspaceAsGeoJson = function(airspaces) {
	var geoData = GeoJSON.parse(airspaces, {'Polygon':'geometry'});
	return geoData;
}