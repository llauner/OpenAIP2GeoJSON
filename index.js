// Import dependencies
var xml2js		= require('xml2js'),
	fs			= require('fs'),
	colors		= require('colors/safe'),
	Q			= require('q'),
    GeoJSON		= require('geojson')
    axios       = require('axios');

var PromiseFtp = require('promise-ftp');

const OpenAipAirspaceUrl = "https://www.openaip.net/customer_export_akfshb9237tgwiuvb4tgiwbf/fr_asp.aip";
const CommonMapDirectory = "xxxmap";
const AirspaceFileName = "openaip-airspace.geojson";

var FtpServerNameHeatmap = process.env.FTP_SERVER_NAME_HEATMAP;
var FtpLoginHeatmap = process.env.FTP_LOGIN_HEATMAP;
var FtpPasswordHeatmap = process.env.FTP_PASSWORD_HEATMAP;

var _ftpConnectionInfo = {host: FtpServerNameHeatmap, user: FtpLoginHeatmap, password: FtpPasswordHeatmap};

// Declare global vars
var airspaces	= [];
var _openAipAirspaceData = null;

exports.main = (req, res) => {
    main();
    res.send('Done !');
  };

function main(){
    console.log(">>> OpenAIP to GeoJSON converter");
    // Shows the main menu used by this little script.
    console.log(FtpServerNameHeatmap);
    getOpenAipAirsapceFile();
}

function getOpenAipAirsapceFile() {
    console.log(colors.green("Getting airspace file from: " + OpenAipAirspaceUrl));
    axios.get(OpenAipAirspaceUrl)
        .then(response => {
            _openAipAirspaceData = response.data;
            getFileData(_openAipAirspaceData);
        })
        .catch(error => {
            console.log(error);
        });
}

function getFileData(data){
    xml2js.parseString(_openAipAirspaceData, function(err, result){
        if(err) { 
            return console.err(err);
        }
        return doAirspaces(result);
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

function createGeoFile(data){
    var geoData = GeoJSON.parse(data, {'Polygon':'geometry'});
    var jsonGeoData = JSON.stringify(geoData);

    // fs.writeFile('./output/airspace.geojson', jsonGeoData, (err) => {
    //     if (err) throw err;
    //     console.log(colors.green(">>> Saved geojson file"));
    // });

    var ftp = new PromiseFtp();
    ftp.connect(_ftpConnectionInfo)
        .then(function (serverMessage) {
            return ftp.cwd(CommonMapDirectory);
        }).then(function () {
            return ftp.put(jsonGeoData, AirspaceFileName);
        }).then(function () {
            return ftp.end();
        });
}
