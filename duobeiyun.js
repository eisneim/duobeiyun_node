/*
 * this is just a simple wraper for doubeiyun's crappy api
 * User: eisneim
 * Date: 2015-05-28
 * Time: 10:33:52
 * Contact: eisneim1@sina.com
 */

// var https = require("https"); 这里使用https 或者http都可以
var http = require("http");
var querystring = require("querystring");
var fs = require("fs");
var crypto = require("crypto");
/**
 * 时间处理的简单模块，仅用于format 时间的格式，例如： 2015-6-1 12:12
 * @type {}
 */
var dateTime = require('../../util/util.datetime.js');

class Duobei {
	constructor( options ){
		this.host = "api.duobeiyun.com";
		this.urls = {
			createRoom: 		"/api/v3/room/create",
			enterRoom: 			"/api/v3/room/enter",

			changeRoomTitle:"/api/v3/room/update/title",
			changeRoomTime: "/api/v3/room/update/time",
			fileToRoom: 		"/api/v3/room/attachDocument",
			fileStatus: 		"/api/v3/documents/status",
			getRoomFiles: 	"/api/v3/room/listDocuments",
			deleteRoomFile: "/api/v3/room/removeDocument",

			uploadFile: 		"/api/v3/documents/upload",
			getFiles: 			"/api/v3/document/list",

			getOrgInfo: 		"/api/v3/merchant",

			getRooms: 			"/api/v3/room/list",
		}

		this.appKey = options.appKey;
		this.partner = options.partner;
		// this.key = 	fs.readFileSync("agent2-key.pem");
		// this.cert = fs.readFileSync("agent2-cert.pem");
	}

	/**
	 * generate query string for request;
	 * @param  {object} object 
	 * @return {string}        the url query string;
	 */
	getQuery( object ){
		object.timestamp = Date.now();
		object.partner = this.partner;

		// firstly make sure thre is no empty value;
		var sanitized = {};
		var keys = [];

		for(var pp in object){
			let value = object[pp];
			if(object.hasOwnProperty(pp) && ( value || value == 0) ){
				keys.push(pp);
			}
		}
		keys.sort(function(a,b){
			return a>b
		});

		keys.forEach(key => {
			sanitized[key] = object[key];
			// make sure it's a string;
			if(sanitized[key] != "string" && sanitized[key].toString ){
				sanitized[key] = sanitized[key].toString();
			}

		});

		if(!object.sign){
			return this.stupidQuery(sanitized);
		}
		var query = querystring.stringify( sanitized, null, null);
		console.log('>>final query:  ',query);
		return query;
		/**
			{ encodeURIComponent: gbkEncodeURIComponent }// if there is some GBK encoded chinese chars
		 */
	}
	/**
	 * 尼玛！！！ 多贝云在生成sign的时候居然不去进行url_encode,这个问题浪费了我好多时间！！！
	 */
	stupidQuery(obj){
		var query = '';
		for(var key in obj){
			query+= key+"="+obj[key]+"&";
		}
		return query.substr(0,query.length-1);
	}
	/**
	 * [hash description]
	 * @param  {[type]} query [description]
	 * @return {[type]}       [description]
	 */
	hash( query ){
		console.log('>>will be hashed:  ',query);
		return crypto.createHash("md5").update( query ).digest("hex");
	}
	/**
	 * POST请求
	 * @param  {[type]} url  [description]
	 * @param  {[type]} body [description]
	 * @return {[type]}      [description]
	 */
	POST( path, formData){
		if(!formData) return Promise.reject("no formData privided!!");

		var options = {
		  hostname: this.host,
		  // port: 443,
		  path: path,
		  method: 'POST',
		  agent: false,
		  headers:{
		  	'Content-Type': 'application/x-www-form-urlencoded',
		  	// "Content-Type": "application/json",
		  	'Content-Length': Buffer.byteLength(formData),
		  }
		};

		console.log("DuoBeiYun post to:",options.hostname+options.path )
		console.log( formData )
		/**
		 * 返回一个Promise， 这里使用的是ES6的原始Proimse, 你可以替换成bluebired或者其他Promise库
		 */
		return new Promise( (resolve,reject) => {
			var resData="";
			var req = http.request(options, function(res) {
			// console.log(res.data)
			  res.setEncoding('utf8');
			  res.on('data', function (chunk) {
			  	resData += chunk;
			  });

			  res.on("end",function(){
					resolve({
						headers: res.headers,
						data:resData});
				});

			});

			req.on('error', reject );
			req.write(formData);
			req.end();
		});
	}
	/**
	 * GET请求
	 * @param {[type]} path      [description]
	 * @param {[type]} urlParams [description]
	 */
	GET(path, urlParams ){

		var options = {
		  hostname: this.host,
		  path: path+"?"+urlParams,
		  method: 'GET',
		};

		console.log("DuoBeiYun GET:",options.hostname+options.path )

		return new Promise( (resolve,reject) => {
			var resData="";
			var req = http.request(options, function(res) {
			// console.log(res.data)
			  res.setEncoding('utf8');
			  res.on('data', function (chunk) {
			  	resData += chunk;
			  });

			  res.on("end",function(){
					resolve({
						headers: res.headers,
						data:resData})
				});

			});

			req.on('error', reject );
			// write data to request formData
			// req.write(formData);
			req.end();
		});
	}

	/**
	 * [signedQuery description]
	 * @param  {[type]} postBody [description]
	 * @return {[type]}          [description]
	 */
	signedQuery( postBody ){
		var signQuery = this.getQuery( postBody ) + this.appKey;
		postBody.sign = this.hash( signQuery );
		return this.getQuery( postBody )
	}

// ================================================================================
	/**
	 * [createRoom description]
	 * @param  {[type]} args [description]
	 * @return {[type]}      [description]
	 */
	createRoom( args ){
		var now = new Date();
		var postBody = {
			title: args.title,
			video: args.video || 0,
			startTime: args.startTime || now.yymmddhhmm(),
			duration: args.duration || 4,
			roomType: args.roomType || 2,
		};

		return this.POST( this.urls.createRoom, this.signedQuery(postBody) );
	}

	enterRoomUrl(args){
		var postBody = {
			uid: args.uid,
			roomId: args.roomId,
			nickname: args.nickname,
			//可选值为1,2,3,4。 
			//值为1时表示以 主讲人身份进入教室，
			//值为2时表示以听众身份进入教室，
			//值为3时表示以隐身监课者身份进入，
			//值为4时表示以房间助教身份进入教室。当请求不加该参 数时默认以听众身份进入
			userRole: args.userRole || 2,
		};
		return this.host+this.urls.enterRoom +"?"+this.signedQuery(postBody)
	}

	enterRoom(args){
		var url = this.enterRoomUrl(args).replace(this.host,"");
		var arr = url.split("?");
		return this.GET( arr[0], arr[1] );
	}

	changeRoomTitle(args){
		var postBody = {
			uid: args.uid,
			roomId: args.roomId,
			title: args.title,
		};

		return this.POST( this.urls.changeRoomTitle, this.signedQuery(postBody) );
	}

	changeRoomTime(arg){
		var postBody = {
			uid: args.uid,
			roomId: args.roomId,
			startTime: args.startTime,
			duration: args.duration,
		};

		return this.POST( this.urls.changeRoomTime, this.signedQuery(postBody) );
	}

	fileToRoom(args){
		var postBody = {
			uid: args.uid,
			roomId: args.roomId,
			documentId: args.documentId,
		};

		return this.POST( this.urls.fileToRoom, this.signedQuery(postBody) );
	}

	fileStatus(args){
		var postBody = {
			documentId: args.documentId,
		};

		return this.POST( this.urls.fileStatus, this.signedQuery(postBody) );
	}

	getRoomFiles(args){
		var postBody = {
			roomId: args.roomId,
		};

		return this.POST( this.urls.getRoomFiles, this.signedQuery(postBody) );
	}

	deleteRoomFile(args){
		var postBody = {
			roomId: args.roomId,
			documentId: args.documentId,
		};

		return this.POST( this.urls.deleteRoomFile, this.signedQuery(postBody) );
	}

	getFiles(args){
		var postBody = {
			title: args.title,
			pageNo: args.pageNo,
		};

		return this.POST( this.urls.getFiles, this.signedQuery(postBody) );
	}

	getOrgInfo(args){
		var postBody = {};
		return this.POST( this.urls.getOrgInfo, this.signedQuery(postBody) );
	}

	getRooms(args){
		var postBody = {
			title: args.title,
			startTime: args.startTime,
			endTime: args.endTime,
			pageNo: args.pageNo,
		};

		return this.POST( this.urls.getRooms, this.signedQuery(postBody) );
	}
	//  浏览器直接post ，不用调这个API
	uploadFile(args){
		
	}

}

/**
 * export this out;
 * options = {
 * 		appKey: "sssssss",
 * 		partner: "23423423423",
 * }
 */
module.exports = function(options){
	if(!options) options = require('../../_config/secret.js').duobei ;
	return new Duobei(options);
}

