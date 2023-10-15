
const express = require('express'); // Express web server framework
const request = require('request'); // "Request" library
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const fs = require("fs")
const client_id = '1770fc80314046a09e2d78c5edf4ede0'; // Your client id
const client_secret = process.env['client_secret']; // Your secret
const redirect_uri = 'https://spotify.catmajor.repl.co/token'; // Your redirect uri
const ytdl = require("ytdl-core")
const replit_db = require("@replit/database")
const db = new replit_db()
const yt_key = process.env['youtube']
const Logger = require("./logger.js")
const logger = new Logger()
const AudioProcessor = require("./audioProcessor.js")
const audioProcessor = new AudioProcessor(logger, db)
const yt_id = process.env['id_token']
const yt_cookie = process.env['cookie']

let downloading = []

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const fetchProfile = async (token) => {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET", headers: { Authorization: `Bearer ${token}` }
  });
  const response = await result.json()
  if (response.error) {
    logger.rec("Logging in user failed")
    return false
  }
  return response
}

const stateKey = 'spotify_auth_state';

const app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('', (req, res) => {
  res.set('Content-Type', 'text/html')
  res.send(fs.readFileSync(`login/index.html`, 'utf-8'))
})

const validHTML = ["ui", "db", "popup", "ssh"]
app.get('/p/:html', (req, res) => {
  if (!validHTML.includes(req.params.html)) {
    res.send()
    return
  }
  res.set('Content-Type', 'text/html')
  const html = fs.readFileSync(`${req.params.html}/index.html`, 'utf-8')
  res.send(html)
  
})

validCSS = ["ui", "db", "ssh", "login"]
app.get('/p/:dir/style.css', (req, res) => {
  if (!validCSS.includes(req.params.dir)) {
    res.send()
    return
  }
  res.set('Content-Type', 'text/css')
  const style = fs.readFileSync(`${req.params.dir}/style.css`)
  res.send(style)
})

validScript = ["ui", "db", "login", ""]
app.get('/p/:dir/script.js', (req, res) => {
  if (!validScript.includes(req.params.dir)) {
    res.send()
    return
  }
  res.set('Content-Type', 'text/javascript')
  const js = fs.readFileSync(`${req.params.dir}/script.js`)
  res.send(js)
})

app.get('/p/ui/img/:type', (req, res) => {
  if (req.params.type!=="png"&&req.params.type!=="jpg") {
    res.send()
    return
  }
  res.set('Content-Type', `image/${req.params.type}`)
  const img = fs.readFileSync(`ui/cat_image.${req.params.type}`)
  res.send(img)
})
app.get('/favicon.ico', (req, res) => {
  res.set('Content-Type', `image/png`)
  const img = fs.readFileSync(`ui/cat_image.png`)
  res.send(img)
})
app.get('/db', (req, res) => {
  req.query.key
})
app.post('/db', (req, res) => {
  req.query.creds
  req.query.key
  req.query.data
})
app.get('/check', async (req,res) => {
  const token = req.query.token  
  let response = await fetchProfile(token)
  res.send(response?"true":"false")
})

app.get('/token', (req, res) => {
  const code = req.query.code
  let authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    }
  let access_token = null;
  request.post(authOptions, (err, resp, body) => {
    access_token = body.access_token
    refresh_token = body.refresh_token
    fetchProfile(access_token).then(response => {
      logger.rec(`${response.display_name} logged in.`)
    })
    if (access_token !== null) {
      res.redirect(`/p/popup?token=${access_token}&refresh=${refresh_token}`) 
  }
  })
  
  
  
})
app.get('/login', function(req, res) {
  const state = generateRandomString(16);

  // your application requests authorization
  const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});
//yoink my code now
app.get('/refresh_token', function(req, res) {
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64')),
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
      fetchProfile(access_token).then(response => {
        logger.rec(`${response.display_name} requested and aquired access token`)
      })
    }
    if (body.error) {
      res.status(401)
      res.json({error: "Invalid Refresh"})
    }
  });
});
//i have actually no clue how streams work so like please don't judge -- ok 2 months later i do lets see if i learned something -- i did not learn anything
app.get('/songs', async (req, res) => {
  if (!(req.query.song && req.query.name)) {
    res.send()
    return
  }
  logger.rec(`${req.query.displayname} requested ${req.query.name}`)
  const song = req.query.song
  let songsAtIndex = await db.get(song[0])
  if (!songsAtIndex[song]) {
    logger.rec(`${req.query.name} with ID ${req.query.song} new entry in DB`)
    const name = req.query.name
    const ytsearch = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${yt_key}&q=${name}&type=video&part=snippet`)
    const ytresponse = await ytsearch.json()
    songsAtIndex[req.query.song] = [ytresponse.items[0].id.videoId, name]
    db.set(song[0], songsAtIndex)
  }
  res.set("Accept-Ranges", "bytes")
  res.set('Content-Type', 'audio/mpeg');
  if (fs.readdirSync("./songs").includes(`${song}.webm`)) {
    res.send(fs.readFileSync(`./songs/${song}.webm`))
    res.end()
  }
  else if (fs.readdirSync("./cached").includes(`${song}.webm`)) {
    res.send(fs.readFileSync(`./cached/${song}.webm`))
    res.end()
  } else {
    logger.rec(`${req.query.name} with ID ${req.query.song} not in cache. Adding...`)
    if (downloading.includes(song)) {
      return
    }
    downloading.push(song)
    const url = `https://www.youtube.com/watch?v=${songsAtIndex[song][0]}}`
    res.status(200)
    fs.writeFileSync(`./cached/${song}.webm`, "")
    let stream = ytdl(url, {
       filter: "audioonly",
       requestOptions: {
          headers: {
            cookie: yt_cookie,
            'x-youtube-identity-token': yt_id,
          },
        },
    });
    stream.pipe(res)
    stream.on("data", chunk => {
      fs.appendFileSync(`./cached/${song}.webm`, chunk)
    }).on("error", () =>  {
      fs.unlinkSync(`./cached/${song}.webm`)
      downloading = downloading.filter(e => e!==song)
    }).on("end", () => {
      logger.rec(`Finished Download of ${songsAtIndex[song][1]}`)
      res.end()
      downloading = downloading.filter(e => e!==song)
      audioProcessor.normalize(song)
    })  
  } 
})
app.get("/songs/info", async (req, res)=> {
  if (!req.query.song) {
    res.set("Content-type", "text/html")
    res.send("works")
    return
  }
  const spotifyID = req.query.song
  const cached = fs.readdirSync("./cached")
  const dbInfo = await db.get(spotifyID[0])
  const testing = false
  let status = 404
  
  let volume = 1
  let currentVersion = 0.1
  if (fs.readdirSync("./songs").includes(`${spotifyID}.webm`)) {
    status = 200
    volume = 2
  } else {
    const filePath = `./cached/${spotifyID}.webm`
    if (dbInfo[spotifyID]) {
       dbInfo[spotifyID] = [dbInfo[spotifyID][0], dbInfo[spotifyID][1]]
      db.set(spotifyID[0], dbInfo)
    }
  }
  
  const body = {
    status: status,
    volume: volume
  }
  res.json(body)
})

//clear cache and temp (both directories that hold files temporarily while normalization occurs) on new boot -- stops corruption of/extra files
let cached = fs.readdirSync("./cached")
cached.forEach(e => fs.unlinkSync(`./cached/${e}`))
let temp = fs.readdirSync("./temp")
temp.forEach(e => fs.unlinkSync(`./temp/${e}`))
logger.rec('Listening on 8888');
app.listen(8888);