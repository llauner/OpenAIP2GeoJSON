// Import dependencies
var xml2js		= require('xml2js'),
	fs			= require('fs'),
	colors		= require('colors/safe'),
	Q			= require('q'),
    GeoJSON		= require('geojson')
    axios       = require('axios'),
    Promise     = require('promise');

const util = require('util');

var PromiseFtp = require('promise-ftp');

const OpenAipAirspaceUrl = "https://www.openaip.net/customer_export_akfshb9237tgwiuvb4tgiwbf/fr_asp.aip";
const CommonMapDirectory = "airspacedata";
const AirspaceFileName = "openaip-airspace.geojson";

var FtpServerNameHeatmap = process.env.FTP_SERVER_NAME_HEATMAP;
var FtpLoginHeatmap = process.env.FTP_LOGIN_HEATMAP;
var FtpPasswordHeatmap = process.env.FTP_PASSWORD_HEATMAP;

var _ftpConnectionInfo = {host: FtpServerNameHeatmap, user: FtpLoginHeatmap, password: FtpPasswordHeatmap};

const parseStringPromise = util.promisify(xml2js.parseString)

// Declare global vars
var airspaces	= [];

exports.main = (req, res) => {
    main().then(response => {
        var message = ">>> OK :" + response;
        console.log(message);
        res.send(message);
    });
    
};

if (process.env.DEBUG) {
    main().then(response => {
        console.log(">>> OK :" + response);
        process.exit(0);
    });
    
}

async function main(){
    console.log(">>> OpenAIP to GeoJSON converter");
    var openAipFileData = await getOpenAipAirsapceFile();
    var openAipXml = await getFileData(openAipFileData);
    var geojsonOpenAip = doAirspaces(openAipXml);
    await dumpToFtp(geojsonOpenAip);

    var response = JSON.stringify({
        airspaceCount: airspaces.length
    })
    return Promise.resolve(response);
}

async function getOpenAipAirsapceFile() {
    console.log(colors.green("Getting airspace file from: " + OpenAipAirspaceUrl));
    return axios.get(OpenAipAirspaceUrl)
        .then(response => {
            return response.data;
        })
        .catch(error => {
            console.log(error);
        });
}

async function getFileData(openAipAirspaceData){
    console.log(colors.green("Parsing Openaip data."));
    return parseStringPromise(openAipAirspaceData)
        .then(data => {
            return data;
        })
        .catch(err => {
            return console.err(err);
        }
    );
}

function doAirspaces(inputData){
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
        airspace.guid = airspace.category + "#" + airspace.name;

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

        // Filter out so that we don't add the same airspace twice
        var isAlreadyInserted = airspaces.some(a => JSON.stringify(a) === JSON.stringify(airspace));
        if (!isAlreadyInserted)
            airspaces.push(airspace);
        else {
            //var existingAirspace = airspaces.filter(a => JSON.stringify(a) === JSON.stringify(airspace));
        }
    }
    console.log(colors.yellow("DONE : "+ airspaces.length + " airspaces"));
    return airspaces;
}

async function dumpToFtp(data){
    console.log(colors.yellow(">>> Writing result to FTP : "+ FtpServerNameHeatmap));
    var geoData = GeoJSON.parse(data, {'Polygon':'geometry'});
    var jsonGeoData = JSON.stringify(geoData);

    // fs.writeFile('./output/airspace.geojson', jsonGeoData, (err) => {
    //     if (err) throw err;
    //     console.log(colors.green(">>> Saved geojson file"));
    // });

    var ftp = new PromiseFtp();
    return ftp.connect(_ftpConnectionInfo)
        .then(function (serverMessage) {
            return ftp.cwd(CommonMapDirectory);
        }).then(function () {
            return ftp.put(jsonGeoData, AirspaceFileName);
        }).then(function () {
            return ftp.end();
        });
}
