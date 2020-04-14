// Import dependencies
var xml2js		= require('xml2js'),
	fs			= require('fs'),
	colors		= require('colors/safe'),
	Q			= require('q'),
	GeoJSON		= require('geojson');
// Declare global vars
var airspaces	= [],

	pathInput   = "./input/",
	pathOutput	= "./output/"


init();

function init(){
	// Shows the main menu used by this little script.
	console.log(">>> OpenAIP to GeoJSON converter");
	console.log(colors.red("Be sure all your files in the \"input\" folder."));
	console.log(colors.green(">>> reading [input] folder"));
	fs.readdir(pathInput, function(err, items) {
		for (var i=0; i<items.length; i++) {
            if(items[i].indexOf('airspace') !== -1){
                getFileData(items[i]);
            }
		}
	});
}

function doAirspaces(inputData){
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
        airspaces.push(airspace);
    }
    console.log(colors.yellow(">>> DONE : "+ airspaces.length + " airspaces"));

    // Create file
    createGeoFile(airspaces);
}

function getFileData(item){
	var file = pathInput+item;
    var ext = item.slice(-3);
    if( ext === 'aip'){
        fs.readFile(file, 'utf8', function(err, data){
            if(err){ return console.err(err); }
            xml2js.parseString(data, function(err, result){
                if(err) { return console.err(err);}
                return doAirspaces(result);
            });
        });
    } else {
        console.log(colors.red(">> Files with extension " + ext + " are not supported at the moment."));
    }
}

function createGeoFile(data){
    var geoData = GeoJSON.parse(data, {'Polygon':'geometry'});
    fs.writeFile('./output/airspace.geojson', JSON.stringify(geoData), (err) => {
        if (err) throw err;
        console.log(colors.green(">>> Saved geojson file"));
    });
}
