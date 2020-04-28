// Import dependencies
var xml2js		= require('xml2js'),
	fs			= require('fs'),
	colors		= require('colors/safe'),
	Q			= require('q'),
    GeoJSON		= require('geojson')
    axios       = require('axios'),
    Promise     = require('promise'),
    _           = require('lodash'),
    moment      = require('moment'),
    PromiseFtp  = require('promise-ftp');
    
const util = require('util');

var airspace = require('./airspace'), 
    airport     = require('./airport');

const OpenAipAirspaceUrl = "https://www.openaip.net/customer_export_akfshb9237tgwiuvb4tgiwbf/fr_asp.aip";
const OpenAipAirportUrl = "https://www.openaip.net/customer_export_akfshb9237tgwiuvb4tgiwbf/fr_wpt.aip";

const CommonMapDirectory = "tracemap/airspacedata";
const AirspaceFileName = "openaip-airspace.geojson";
const MetaDataFilenName = "openaip-airspace-metadata.json";
const AirportFileName = "openaip-airport.geojson";

var FtpServerNameHeatmap = process.env.FTP_SERVER_NAME_HEATMAP;
var FtpLoginHeatmap = process.env.FTP_LOGIN_HEATMAP;
var FtpPasswordHeatmap = process.env.FTP_PASSWORD_HEATMAP;

var _ftpConnectionInfo = {host: FtpServerNameHeatmap, user: FtpLoginHeatmap, password: FtpPasswordHeatmap};

const parseStringPromise = util.promisify(xml2js.parseString)

// Declare global vars
var _openAipAirspaceMetadata = {};

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
    console.log("--- Convert Airports ...");
    var openAipAirportsFileData = await getOpenAipFile(OpenAipAirportUrl);
    var openAipAirportXml = await parseDataToXML(openAipAirportsFileData);
    var geojsonOpenAipAirport = airport.doAirports(openAipAirportXml);

    console.log("--- Convert Airspace ...");
    var openAipFileData = await getOpenAipFile(OpenAipAirspaceUrl);
    var openAipXml = await parseDataToXML(openAipFileData);
    var geojsonOpenAip = airspace.doAirspaces(openAipXml);

    // --- Populate metadata ---
    _openAipAirspaceMetadata.date = moment().format('DD/MM/YYYY HH:mm:ss');
    _openAipAirspaceMetadata.airspaceCount = geojsonOpenAip.length;

    // -- Send everything to FTP
    await dumpToFtp(geojsonOpenAip, geojsonOpenAipAirport);

    var response = JSON.stringify({
        airspaceCount: geojsonOpenAip.length,
        airportsCount: geojsonOpenAipAirport.length
    })
    return Promise.resolve(response);
}

/**
 * getOpenAipFile
 * Get Data from Url. Retrieves files from the Open AIP website
 * @param {*} url
 * @returns
 */
async function getOpenAipFile(url) {
    console.log(colors.green("Getting airspace file from: " + url));
    return axios.get(url)
        .then(response => {
            return response.data;
        })
        .catch(error => {
            console.log(error);
        });
}

/**
 * parseDataToXML
 *
 * @param {*} openAipAirspaceData
 * @returns
 */
async function parseDataToXML(openAipData){
    console.log(colors.green("Parsing Openaip data."));
    return parseStringPromise(openAipData)
        .then(data => {
            return data;
        })
        .catch(err => {
            return console.err(err);
        }
    );
}

async function dumpToFtp(airspaceData, airportData){
    console.log(colors.yellow(">>> Writing result to FTP : "+ FtpServerNameHeatmap));
    // -- Airspace
    var airspaceGeoData = airspace.getAirspaceAsGeoJson(airspaceData);
    var jsonAirspace = JSON.stringify(airspaceGeoData);

    // -- MetaData
    var jsonMetadata = JSON.stringify(_openAipAirspaceMetadata);

    // -- Airports
    var airportsGeoData = airport.getAirportsAsGeoJson(airportData);
    var jsonAirports = JSON.stringify(airportsGeoData);

    // fs.writeFile('./output/airspace.geojson', jsonGeoData, (err) => {
    //     if (err) throw err;
    //     console.log(colors.green(">>> Saved geojson file"));
    // });

    var ftp = new PromiseFtp();
    return ftp.connect(_ftpConnectionInfo)
        .then(function (serverMessage) {
            return ftp.cwd(CommonMapDirectory);
            })
        .then(function () {
            return ftp.put(jsonAirspace, AirspaceFileName);
            })
        .then(function () {
            return ftp.put(jsonMetadata, MetaDataFilenName);
            })
        .then(function () {
            return ftp.put(jsonAirports, AirportFileName);
        })
        .then(function () {
            return ftp.end();
        });
}
