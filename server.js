var express = require('express')
  , databaseUrl = "mongodb://overit:0v3r1t123@dharma.mongohq.com:10070/overit"
  , collections = ['overits', 'links']
  , everyauth = require('everyauth')
  , conf = require('./conf')
  , db = require("mongojs").connect(databaseUrl,collections)
  , everyauthRoot = __dirname + '.'
  , request = require("request")
  , Twit = require("twit");

var T = new Twit({
    consumer_key:         '1tTY8hBE4mRtc0THY66l7A'
  , consumer_secret:      'DkWHrpfziWxoTY8RbaQNT5sfOcQ2KTe4omMZk90xKk'
  , access_token:         '654193-SSK2RC39ZSKRZ6LgS8HY0YYgNyrbaW3D7IGbKnQTg'
  , access_token_secret:  'pedalNH6hrDJ5BOg9RGWyqw501Z6FUpAkCyrhH8B3pc'
})

var port = 3001

var usersById = {};
var nextUserId = 0;
var baseurl = '/1.0/';

function addUser (source, sourceUser) {
  var user;
  if (arguments.length === 1) { // password-based
    user = sourceUser = source;
    user.id = ++nextUserId;
    return usersById[nextUserId] = user;
  } else { // non-password-based
    user = usersById[++nextUserId] = {id: nextUserId};
    user[source] = sourceUser;
  }
  return user;
}

everyauth.everymodule
  .findUserById( function (id, callback) {
    callback(null, usersById[id]);
  });

var usersByTwitId = {};

everyauth
  .twitter
    .consumerKey(conf.twit.consumerKey)
    .consumerSecret(conf.twit.consumerSecret)
    .findOrCreateUser( function (sess, accessToken, accessSecret, twitUser) {
      return usersByTwitId[twitUser.id] || (usersByTwitId[twitUser.id] = addUser('twitter', twitUser));
    })
    .redirectPath('/');

var app = express();
app.use(express.static(__dirname + '/public'))
  .use(express.favicon())
  .use(express.bodyParser())
  .use(express.cookieParser('htuayreve'))
  .use(express.session())
  .use(everyauth.middleware());


app.configure( function () {
  app.set('view engine', 'jade');
  app.set('views', 'views');
});

//show everyauth params
app.get('/twitter/', function(req, res){
	console.log(everyauth.twitter.configurable());
	res.send(everyauth.twitter.configurable());
	
})

app.get('/', function(req, res){
	res.redirect("http://docs.greg3.apiary.io/");
})

//GET methods
app.get(baseurl + 'publictimeline', function (req, res){
	//return a list of the public timeline of overits
	size = req.query.size;
	db.overits.find().limit(size, function(err, data){
		res.json(data);
	});
});

app.get(baseurl + 'overits', function (req, res){
	//return a list of my most recent OverIts res.json()
	//param: size=record count to return
	size = req.query.size;
	user = req.user.twitter.screen_name;
	db.overits.find({user: user}).limit(size, function(err, data){
		res.json(data);
	});
	
})

app.get(baseurl + 'user', function (req, res){
	//return all of the users OverIts and their OverIt URL
	//param: username (twitter User ID)
	user = req.query.user;
	size = req.query.size;
	console.log("user: " + user + "size: " + size);
	db.overits.find({user: user}).limit(size, function(err, data){
		res.json(data);
	});
	
})

app.get(baseurl + 'recomend', function (req, res){
	//return all of recomended sites and their overit URL
	//params: username (Twitter UserName)
	username = req.query.username;
	
})

app.get(baseurl + 'shortcode', function (req, res){
  url = req.query.url;
  db.links.find({url: url}, function(err, data){
    res.json(data);
  })
})

//GET Nested Dictonary for Pearson Correlation
app.get(baseurl + 'pearson', function (req, res){
	results = "results";
	var pearsondict = [results];
	var newentry = {};
	db.links.find({}, function(err, data){
		returnlen = data.length
		for (var i = 0; i < returnlen; i++){
			data = lookuper(data[i].url);
			pearsondict.push(data);
			console.log(pearsondict);
		};
	res.json(JSON.stringify(pearsondict));
	});
	//console.log("3" + JSON.stringify(pearsondict));

})

//PUTS
app.put(baseurl + 'overit', function (req, res){
	//post a new OverIt
	//Params: TwitterName retrieved via Loged-In user
	//        URL (url)
	var url = req.query.url;
	var shortcode = makeid(url);
    var datetime = new Date().getTime();

	db.overits.save({timestame: datetime , user: req.user.twitter.screen_name, url: url}, function(err, overits){
    console.log("saving the overit...");
      
      // If the URL doesn't start with http, add it.
      if (url.search(/^http/) == -1) {
          url = 'http://' + url;
      
      }

      console.log("here's the shortcode: " + shortcode);
      

          db.links.save({shortcode: shortcode, url: url}, function(err, saved) {

            if( err || !saved ) {
               console.log("Link not saved...already exists");
               db.links.find({url: url}, function(err, data){
                  console.log("here's the shortcode: " + JSON.stringify(data[0].shortcode));

                 // res.redirect('/' + data[0].shortcode);
				  res.json([{"status": 201, "shortcode": shortcode}])
               });

              //res.send("Here's your shortcode: " + shortcode);
            } else {
               console.log("Link saved: http://www.delike.us/" + shortcode );
              //res.redirect('/'+shortcode);
				res.json([{"status": 201, "shortcode": shortcode }])
            }

          });
      })
	
})

//Look-up user count for a given link
function lookuper(url)
{
	//console.log(data[i].url);
	newurl = url;
	obj1 = [];
	obj2 = [];
	db.overits.aggregate( [ { $match: {url: newurl} }, 
							{ $group: { _id: "$user", total: { $sum: 1 }, url: { $addToSet: "$url"}, user: { $addToSet: "$user" }  } }, 
							{ $sort: { total: -1 } } ], function (err, results){
			for (var u = 0; u < results[0].user.length; u++){
				nexturl = JSON.stringify(results[0].url[0]);
				nextuser = JSON.stringify(results[0].user[u]);
				nexttotal = JSON.stringify(results[0].total);
				user = JSON.stringify(results.user);
				//console.log("url: " + nexturl + "user: " + nextuser + " total: " + nexttotal);
				//Build JSON object that looks like {"http://www.google.com": {"gstatton": 3, "mrkai": 5, "jameschho": 1}}
				obj1 = [nexturl];
				obj2 = [nextuser];
				obj2.push(nexttotal);
				data = {user : nexttotal};
				obj1.push(obj2);
				//newobj.userobj.push(nexttotal);
				//console.log(JSON.stringify(tempobj));
			}
			//console.log(obj1);
			return obj1;
		});
	//console.log(obj1);	
	//return obj1;
}

// Link shortener logic
function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}




app.listen(process.env.PORT || port);
console.log('starting server on port ' + port);
