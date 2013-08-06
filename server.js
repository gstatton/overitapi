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
	res.redirect("http://greg3.apiary.io");
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
  db.shortcode.find({url: url}, function(err, data){
    res.json(data);
  })
})

//PUTS
app.put(baseurl + 'overit', function (req, res){
	//post a new OverIt
	//Params: Twitter Userid (username)
	//        URL (url)
	username = req.query.username;
	url = req.query.url;
	
})




app.listen(process.env.PORT || port);
console.log('starting server on port ' + port);
