/*
 * Author: Kyle Phelps
 * Date: February 13, 2015
 * Version: 0.1
 * Description: Simple utility for exporting a pipe-delimited CSV of all Eloqua contact fields and their dependencies.
 * Usage: node eloquaFieldDependencyExport COMPANY USERNAME PASSWORD
 *
*/

// Node.js modules
var request = require('request');
var fs = require('graceful-fs');

var args = process.argv.slice(2);

if(args.length != 3){
	console.log('ERROR: Invalid arguments. Usage: node eloquaFieldDependencyExport [-COMPANY] [-USERNAME] [-PASSWORD]')
	process.exit(1);
}
  
//  Basic Authentication string  
var authenticationHeader = "Basic " + new Buffer(args[0] + "\\" + args[1] + ":" + args[2]).toString("base64");

var csvHeaders = [
	'Field Name',
	'Field Internal Name',
	'Field ID',
	'Field Created By',
	'Field Created Date',
	'Field Last Modified By',
	'Field Last Modified Date',
	'Dependency Name',
	'Dependency ID',
	'Dependency Type',
	'Dependency Created By',
	'Dependency Created Date',
	'Dependency Last Modified By',
	'Dependency Last Modified Date'
];

var csvDelimiter = '|';

writeCSVHeaders(csvHeaders, csvDelimiter);


//Make call to segment to get length and then call the 
function writeCSVHeaders(headers, delimiter) {
	request({
		//API endpoint shows all included contacts from a given segment
		url : "https://secure.eloqua.com/API/REST/2.0/assets/contact/fields?depth=complete",
		headers : { "Authorization" : authenticationHeader },
	}, function (error, response, body) {
		
			if(!error && response.statusCode == 200){  
		        json = JSON.parse(body);
		        var totalFields = json.total;
	
				console.log('Completed Field Lookup. Number of fields found: ' + json.total);


				var headerString = '';

				for(x=0; x<csvHeaders.length; x++){
					
					if(x == csvHeaders.length - 1){

						headerString += headers[x] + '\r\n';

						fs.writeFile("./fieldDependencies.csv", headerString, function(err) {
						    if(err) {
						        console.log(err);
						    } else {
						        console.log("CSV headers written successfully to file.");
						    }
						});

					} else {

						headerString += headers[x] + delimiter;

					}

				}

				for(x=0; x<totalFields; x++){


					var fieldObject = {
						'fieldCount' : x,
						'totalFields' : totalFields,
						'fieldName' : json.elements[x].name,
						'fieldInternalName' : json.elements[x].internalName,
						'fieldID' : json.elements[x].id,
						'fieldCreatedBy' : '',
						'fieldCreatedByID' : json.elements[x].createdBy,
						'fieldCreatedDate' : json.elements[x].createdAt,
						'fieldLastModifiedBy' : '',
						'fieldLastModifiedByID' : json.elements[x].updatedBy,
						'fieldLastModifiedDate' : json.elements[x].updatedAt,
						'dependencyName' : '',
						'dependencyID' : '',
						'dependencyType' : '',
						'dependencyCreatedBy' : '',
						'dependencyCreatedByID' : '',
						'dependencyCreatedDate' : '',
						'dependencyLastModifiedBy' : '',
						'dependencyLastModifiedByID' : '',
						'dependencyLastModifiedDate' : ''
					};

					getUserName(fieldObject, fieldObject.fieldCreatedByID, 'fieldCreatedBy', function(obj){
						getUserName(obj, obj.fieldLastModifiedByID, 'fieldLastModifiedBy', function(fieldObject){
							getFieldDependencies(obj);
						});
					});

				}

			} else {
				console.log('ERROR: Could not authenticate with Eloqua. Please check your username / password and try again.');
			}
			
	}); 
}

function getUserName(fieldObject, fieldObjectIDAttribute, fieldObjectNameAttribute, callback){

		request({  
			url : "https://secure.eloqua.com/API/REST/2.0/system/user/" + fieldObjectIDAttribute +"?depth=minimal",
			headers : { "Authorization" : authenticationHeader }
		}, function (error, response, body) {

				if(!error && response.statusCode == 200){  
			        json = JSON.parse(body);

			        fieldObject[fieldObjectNameAttribute] = json.name;
			        callback(fieldObject);

					
				} else {

					console.log('WARNING: No user name found on field "' + fieldObject.fieldName + '" for field property: "' + fieldObjectNameAttribute + '"');
					fieldObject[fieldObjectNameAttribute] = 'null';
			        callback(fieldObject);

				}
		});
}

function getFieldDependencies(fieldObject) {
	
	request({  
		url : "https://secure.eloqua.com/API/REST/2.0/assets/contact/field/"+ fieldObject.fieldID +"/dependencies",
		headers : { "Authorization" : authenticationHeader }
	}, function (error, response, body) {
			console.log('Processing field ' + fieldObject.fieldCount + ' of ' + fieldObject.totalFields);
			if(!error && response.statusCode == 200){  
		        json = JSON.parse(body);
					
				for(x=0; x<json.length; x++){


					fieldObject.dependencyName = json[x].name;
					fieldObject.dependencyID = json[x].id;
					fieldObject.dependencyType = json[x].type;
					
					switch(json[x].type){
						case 'ContactFilter':
							var uri = 'https://secure.eloqua.com/API/REST/2.0/assets/contact/filter/'+ json[x].id +'?depth=minimal';
							getDependencyDetails(uri, fieldObject);
							break;

						case 'ContactUpdateRuleSet':

							//No API endpoint currently exists for this dependency type, so details can not be retrieved.
							fieldObject.fieldCreatedBy = 'null';
							fieldObject.fieldLastModifiedBy = 'null';
							fieldObject.dependencyCreatedBy = 'null';
							fieldObject.dependencyLastModifiedBy = 'null';
							writeToCSV(fieldObject);
							break;

						case 'ContactView':
							var uri = 'https://secure.eloqua.com/API/REST/2.0/assets/contact/view/' +json[x].id + '?depth=minimal';
							getDependencyDetails(uri, fieldObject);
							break;

						case 'CustomObject':
							var uri = 'https://secure.eloqua.com/API/REST/2.0/assets/customObject/' +json[x].id + '?depth=minimal';
							getDependencyDetails(uri, fieldObject);
							break;

						case 'DynamicContent':
							var uri = 'https://secure.eloqua.com/API/REST/2.0/assets/dynamicContent/' +json[x].id + '?depth=minimal';
							getDependencyDetails(uri, fieldObject);
							break;

						case 'FieldMerge':
							var uri = 'https://secure.eloqua.com/API/REST/2.0/assets/fieldMerge/' +json[x].id + '?depth=minimal';
							getDependencyDetails(uri, fieldObject);
							break;

						case 'FormProcessingStep':

							//No API endpoint currently exists for this dependency type, so details can not be retrieved.
							fieldObject.fieldCreatedBy = 'null';
							fieldObject.fieldLastModifiedBy = 'null';
							fieldObject.dependencyCreatedBy = 'null';
							fieldObject.dependencyLastModifiedBy = 'null';
							writeToCSV(fieldObject);
							break;

						case 'Microsite':
							var uri = 'https://secure.eloqua.com/API/REST/2.0/assets/microsite/' +json[x].id + '?depth=minimal';
							getDependencyDetails(uri, fieldObject);
							break;

						case 'Program':
							var uri = 'https://secure.eloqua.com/API/REST/2.0/assets/program/' +json[x].id + '?depth=minimal';
							getDependencyDetails(uri, fieldObject);
							break;

						default:
							console.log('WARNING!!! Dependency type not found for: ' + fieldObject.fieldName + "|" + fieldObject.fieldInternalName + "|" + fieldObject.fieldID  + "|" + json[x].name + "|" + json[x].type + "|" + json[x].id);
					} 

				}
				
			} else if(!error && response.statusCode == 204){
				console.log('FLAG: Zero Dependencies for field name: ' + fieldObject.fieldName);
			} else {
				console.log('ERROR: ' + error);
			}
	});
}

function getDependencyDetails(uri, fieldObject){

	request({  
		url : uri,
		headers : { "Authorization" : authenticationHeader }
	}, function (error, response, body) {

			if(!error && response.statusCode == 200){  
		        json = JSON.parse(body);

		        fieldObject.dependencyCreatedByID = json.createdBy;
		        fieldObject.dependencyCreatedDate = json.createdAt;
		        fieldObject.dependencyLastModifiedByID = json.updatedBy;
		        fieldObject.dependencyLastModifiedDate = json.updatedAt;

		        getUserName(fieldObject, fieldObject.dependencyCreatedByID, 'dependencyCreatedBy', function(obj){
					getUserName(obj, obj.dependencyLastModifiedByID, 'dependencyLastModifiedBy', function(obj){
						writeToCSV(obj);
					});
				});
				
			} else {
				console.log('ERROR on call "' + uri.substring(38,uri.length) + '": ' + error);
			}
	});

}

function writeToCSV(fieldObject){

    var epochFieldCreatedDate = new Date(0); // The 0 there is the key, which sets the date to the epoch
    var epochFieldLastModifiedDate = new Date(0); 
    var epochDependencyCreatedDate = new Date(0); 
    var epochDependencyLastModifiedDate = new Date(0); 

    epochFieldCreatedDate.setUTCSeconds(fieldObject.fieldCreatedDate);
	epochFieldLastModifiedDate.setUTCSeconds(fieldObject.fieldLastModifiedDate);
	epochDependencyCreatedDate.setUTCSeconds(fieldObject.dependencyCreatedDate);
	epochDependencyLastModifiedDate.setUTCSeconds(fieldObject.dependencyLastModifiedDate);

	var fieldCreatedDate = new Date(epochFieldCreatedDate);
	var fieldLastModifiedDate = new Date(epochFieldLastModifiedDate);
	var dependencyCreatedDate = new Date(epochDependencyCreatedDate);
	var dependencyLastModifiedDate = new Date(epochDependencyLastModifiedDate);

	var csvRecord = fieldObject.fieldName + '|' + fieldObject.fieldInternalName + '|' + fieldObject.fieldID + '|' + fieldObject.fieldCreatedBy + '|' + fieldCreatedDate + '|' + fieldObject.fieldLastModifiedBy + '|' + fieldLastModifiedDate + '|' + fieldObject.dependencyName + '|' + fieldObject.dependencyID + '|' + fieldObject.dependencyType + '|' + fieldObject.dependencyCreatedBy + '|' + dependencyCreatedDate + '|' + fieldObject.dependencyLastModifiedBy + '|' + dependencyLastModifiedDate;

	fs.appendFile("./fieldDependencies.csv", csvRecord + "\r\n", function(err) {
	    if(err) {
	        console.log('ERROR WRITING TO FILE FOR: ' + fieldName);
	    } else {
	        //console.log("Dependency " + x + " of " + json.length + " written to file.");
	    }
	});
}

