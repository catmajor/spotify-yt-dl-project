class SideBarEle {
  constructor(parentDOM, text, index) {
    this.parentDOM = parentDOM
    this.text = text
    this.index = index
    this.DOM = document.createElement("li")
    this.DOM.textContent = text
    this.parentDOM.appendChild(this.DOM)
  }
}
class PlaylistBar extends SideBarEle {
  constructor(token, playlistList, parentDOM, text, index, playlist, songlistDOM, currentSongDOMList, songControls) {
    super(parentDOM, text, index)
    this.playlist = playlist
    this.playlistList = playlistList
    this.songlistDOM = songlistDOM
    this.currentSongDOMList = currentSongDOMList
    this.playlistInfo = null
    this.songlist = []
    this.token = token
    this.songControls = songControls
    this.selectedSongIndex = 0
    this.DOM.addEventListener("mousedown", (event) => {this.display(event)})
  }
  async display(e) {
    this.songlistDOM.innerHTML = ""
    this.playlistList.forEach((ele) => {ele.DOM.classList.remove("selected")})
    this.DOM.classList.add("selected")
    if (!this.playlistInfo) {
      this.playlistInfo = await getSpecificPlaylist(this.playlist.id)
      this.playlistInfo.items.forEach((cur, ind) => {
        let temp = new Song(this, this.songlistDOM, this.currentSongDOMList, cur.track.name, cur.track.duration_ms, this.getAuthors(cur), cur.track.href, ind)
        this.songlist.push(temp)
      })
    }
    else {
      this.songlist.forEach(cur => cur.display())
    }
    this.songControls.songlist = this.songlist
    this.songControls.playedIndices = []
    this.songControls.currentSong = this.songlist[this.selectedSongIndex]
  }
  getAuthors(song) {
    let allauthors = ""
    song.track.artists.forEach((cur, ind) => {
      allauthors += cur.name
      allauthors += (ind+2===song.track.artists.length?' and ':ind+1==song.track.artists.length?'':', ')
    })
    return allauthors
  }
}
class Song {
  constructor(parent, songlistDOM, currentSongDOMList, name, duration_ms, author, apiEndpt, index) {
    this.currentSongDOMList = currentSongDOMList
    this.songlistDOM = songlistDOM
    this.name = name
    this.author = author
    this.index = index
    this.parent = parent
    this.duration = duration_ms
    this.DOM = document.createElement("div")
    this.songlistDOM.appendChild(this.DOM)
    this.nameDOM = document.createElement("p")
    this.marginDOM = document.createElement("p")
    this.durationDOM = document.createElement("p")
    this.nameDOM.textContent = `${this.name} by ${this.author}`
    this.durationDOM.textContent = this.getDurationStr(this.duration)
    this.apiEndpt = apiEndpt
    this.apiObj = null
    this.songInfo = null
    this.searchTerm = null
    this.DOM.appendChild(this.nameDOM)
    this.DOM.appendChild(this.marginDOM)
    this.DOM.appendChild(this.durationDOM)
    this.DOM.addEventListener("mousedown", async (event) => {
      this.parent.songControls.currentSong.hidehighlight()
      await this.play()
      await this.parent.songControls.loadSong()
    })
  }
  async play() {
    this.highlight()
    if (!this.apiObj) {
      this.apiObj = await getSong(this.apiEndpt)
    }
    if (!this.songInfo || this.songInfo.status === 404) {
      this.songInfo = await getSongInfo(this.apiObj.id)
    }
    this.searchTerm = `${this.apiObj.name} by ${this.parent.getAuthors({track: this.apiObj})}`
    this.parent.songControls.currentSong = this
    this.parent.selectedSongIndex = this.index
  }
  display () {
    this.songlistDOM.appendChild(this.DOM)
  }
  highlight () {
    this.DOM.classList.add("selected")
  }
  hidehighlight () {
    this.DOM.classList.remove("selected")
  }
  getDurationStr(duration_ms) {
    let seconds = Math.floor(duration_ms/1000)
    let minutes = Math.floor(seconds/60)
    let secondsoverflow = seconds%60
    return `${minutes}:${secondsoverflow<10?"0":""}${secondsoverflow}`
  }
}
class SongControls {
  constructor(domElements) {
    this.domElements = domElements
    this.songlist = null
    this.playing = false
    this.currentSong = null
    this.time = 0
    this.currentSrc = null
    this.seeking = null
    this.audio = this.domElements.currentsong.audio
    this.metadata = new PlayerMetadata(this)
    this.player = new Player(domElements, this)
    this.autoplay = new Autoplay(domElements, "Autoplay")
    this.shuffle = new Shuffle(domElements, "Shuffle", this)
    this.playedIndices = []
    this.domElements.currentsong.nextarrow.addEventListener("mousedown", (e) => {this.playNext()})
    this.domElements.currentsong.previousarrow.addEventListener("mousedown", (e) => {this.playPrevious()})
    this.audio.addEventListener("ended", async (e) => {
      if (this.autoplay.state) {
        await this.playNext()
        this.beginPlayback(0)
      } else {
        this.stopPlayback()
      }
    }) 
    this.audio.addEventListener("canplay", (e) => {
      if (this.playing) {
        this.audio.play()
      }
    })
    this.audio.addEventListener("timeupdate", (e) => {
      e.preventDefault()
      if (!this.player.suspendUpdate) {
        this.player.playbackUpdate(this.audio.currentTime, this.audio.duration)
      }
    })
    this.audio.addEventListener("loadedmetadata", (e) => {
      e.preventDefault()
      if (this.metadata.enabled) {
        this.metadata.load(this.currentSong)
      }
    })
    this.audio.addEventListener("play", (e) => {
      if (this.metadata.enabled) {
        this.metadata.load(this.currentSong)
      }
    })
  } 
  async playNext () {
    await this.sequentialNext()
  }
  async sequentialNext() {
    let nextIndex = ((this.songlist.length-1)===this.currentSong.index)?0:this.currentSong.index+1
    this.currentSong.hidehighlight()
    await this.songlist[nextIndex].play()
    await this.loadSong()
  }
  async randomNext() {
    if (this.playedIndices.length>=this.songlist.length) {
      this.playedIndices.shift()
    }

    this.currentSong.hidehighlight()
    let songToPlay = this.songlist[this.randomSongIndex()]
    while (this.playedIndices.includes(songToPlay.index)) {
      songToPlay = this.songlist[this.randomSongIndex()]
    }
    await songToPlay.play()
    await this.loadSong()
  }
  playPrevious () {
    this.sequentialPrevious()
  }
  async sequentialPrevious () {
    let previousIndex = (this.currentSong.index===0)?this.songlist.length-1:this.currentSong.index-1
    this.currentSong.hidehighlight()
    await this.songlist[previousIndex].play()
    await this.loadSong()
  }
  async randomPrevious () {
    this.playedIndices.pop()
    if (this.playedIndices.length===0) {
      this.currentSong.play()
      return
    }
    let previousIndex = this.playedIndices[this.playedIndices.length-1]
    this.currentSong.hidehighlight()
    await this.songlist[previousIndex].play()
    await this.loadSong()
    this.playedIndices.pop()
  }
  randomSongIndex () {
    return Math.floor(Math.random()*this.songlist.length)
  }
  async loadSong() {
    this.stopPlayback()
    this.player.playbackUpdate(0, 1)
    if (this.seeking) {
      clearInterval(this.seeking)
      this.seeking = null
    }
    if (this.shuffle.state) {
      this.playedIndices.push(this.currentSong.index)
    }
    this.player.load(this.currentSong.getDurationStr(this.currentSong.duration))
    this.domElements.currentsong.iconImg.src = this.currentSong.apiObj.album.images[0].url
    this.domElements.currentsong.songname.textContent = this.currentSong.searchTerm
    if (this.currentSong.songInfo.status === 404) {
      this.domElements.currentsong.player.style.borderRadius = "10px 10px 0px 0px"
      this.domElements.currentsong.volumeWarning.setAttribute("class", "enabled")
    } else {
      this.domElements.currentsong.player.style.borderRadius = "10px"
      this.domElements.currentsong.volumeWarning.setAttribute("class", "")
    }
    if (this.metadata.enabled) {
      this.metadata.load(this.currentSong)
    }
    console.log("Done Loading Song")
  }
  beginPlayback (time) {
    this.playing = true
    this.player.playBtn.innerHTML = `<i class="material-icons">pause</i>`
    this.player.timer.max = 100
    this.player.timer.min = 0
    this.audio.currentTime = time
    const safeSearchTerm = this.currentSong.searchTerm.replace('&', 'and')
    const url = `songs?name=${encodeURI(safeSearchTerm)}&song=${this.currentSong.apiObj.id}&displayname=${document.displayname}`
    if (this.currentSrc!==url) {
      console.log(url)
      this.currentSrc = url
      this.audio.src = `/${url}`
    }
    this.audio.volume = 0.5 * this.currentSong.songInfo.volume
    this.audio.play()
    if (this.metadata.enabled) {
      navigator.mediaSession.playbackState = "playing"
    }
  }
  stopPlayback () {
    this.playing = false
    this.player.playBtn.innerHTML = `<i class="material-icons">play_arrow</i>`
    this.audio.pause()
    this.time = this.audio.currentTime
    if (this.metadata.enabled) {
      navigator.mediaSession.playbackState = "paused"
    }
  }
  getDurationStr(duration_s) {
    let seconds = Math.floor(duration_s)
    let minutes = Math.floor(duration_s/60)
    let secondsoverflow = seconds%60
    return `${minutes}:${secondsoverflow<10?"0":""}${secondsoverflow}`
  }
}
class Player {
  constructor (domElements, parent) {
    this.domElements = domElements
    this.parent = parent
    this.playBtn = this.domElements.currentsong.playBtn
    this.timer = this.domElements.currentsong.timer
    this.progress = this.domElements.currentsong.progress
    this.timer.addEventListener("input", ()=> {
    })
    this.timer.addEventListener("change", () => {
      const newTime = this.timer.value*this.parent.audio.duration/100
      this.positionChange(newTime)
    })
    this.playBtn.addEventListener("mousedown", () => {
      if (this.parent.playing) {
        this.parent.stopPlayback()
      } else {
        this.parent.beginPlayback(this.parent.time)
      }
    })
  }
  playbackUpdate(currentTime, maxTime) {
    if (!maxTime) {
      return
    }
    this.parent.time = currentTime
    this.updateProgress(currentTime, maxTime)
    this.updateTimer(currentTime/maxTime)
    this.updateLoad(maxTime)
    if(this.parent.metadata.enabled) {
      this.parent.metadata.playbackUpdate(this.parent.audio.currentTime, this.parent.audio.duration)
    }
  }
  updateTimer(percent) {
    this.timer.value = percent*100
    this.timer.style.setProperty("--progress", `${percent*this.timer.clientWidth}px`)
  }
  updateProgress(currentTime, maxTime) {
    let strCurrentTime = this.parent.getDurationStr(currentTime)
    let strMaxTime = this.parent.getDurationStr(maxTime)
    this.progress.textContent = `${strCurrentTime}/${strMaxTime}`
  }
  updateLoad(maxTime) {
    try {
      this.timer.style.setProperty("--load", `${this.parent.audio.buffered.end(0)/maxTime*this.timer.clientWidth}px`)
    } catch (e) {
      this.timer.style.setProperty("--load", `0px`)
    }
  }
  positionChange(newTime) {
    if (this.parent.currentSong.songInfo.status === 404) return
    this.suspendUpdate = true
    this.parent.stopPlayback()
    this.parent.seeking = setInterval(() => {
      this.playbackUpdate(newTime, this.parent.audio.duration)
      if (this.isTimeLoaded(newTime)) {
        this.suspendUpdate = false
        clearInterval(this.parent.seeking)
        this.parent.seeking = null
        this.parent.beginPlayback(newTime)
        }
    }, 100)
  }
  load(durationGuess) {
    this.progress.textContent = `0:00/${durationGuess}`
  }
  isTimeLoaded(time) {
    for (let i = 0; i < audio.buffered.length; i++) {
      if (time < this.parent.audio.buffered.end(0)) {
      return true
      }
    } 
    return false
  }
}
class PlayerMetadata {
  constructor (songControls) {
    this.enabled = true
    this.songControls = songControls
    try {
      this.setFunctionHandlers()
    } catch (e) {
      console.log("MediaControls not detected.")
      this.enabled = false
    }
  }
  setMetadata(song) {
      navigator.mediaSession.metadata = new MediaMetadata(
        {
          title: song.name,
          artist: song.author,
          album: song.apiObj.album.name,
          artwork: this.getImagesObject(song.apiObj.album.images)
        }
      )
  }
  getImagesObject(imagesObj) {
    let imagesArray = []
    imagesObj.forEach((ele) => {
      imagesArray.push(
        {
          src: ele.url,
          sizes: `${ele.height}x${ele.width}`,
          type: "image/png"
        }
      )
    })
    return imagesArray
  }
  setFunctionHandlers() {
    const session = navigator.mediaSession
    session.setActionHandler("play", ()=>{this.songControls.beginPlayback(this.songControls.time)})
    session.setActionHandler("stop", ()=>{this.songControls.stopPlayback()})
    session.setActionHandler("pause", ()=>{this.songControls.stopPlayback()})
    session.setActionHandler("nexttrack", ()=>{this.songControls.playNext()})
    session.setActionHandler("previoustrack", ()=>{this.songControls.playPrevious()})
    session.setActionHandler("seekbackward", (details)=>{this.positionChange(-details.seekOffSet || -10)})
    session.setActionHandler("seekforward", (details)=>{this.positionChange(details.seekOffSet || 10)})
  }
  load(song) {
    this.setMetadata(song)
    this.setFunctionHandlers()
  }
  playbackUpdate(currentTime, duration) {
    if (!(currentTime&&duration)) {
      return
    }
    navigator.mediaSession.setPositionState({
      duration: duration,
      playbackRate: 1,
      position: currentTime
    })
  }
  positionChange(offSet) {
    let newTime = Math.floor(this.songControls.audio.currentTime + offSet)
    this.songControls.player.positionChange(newTime)
  }
}
class AudioController {
  constructor (audioElem) {
    this.audioElem = audioElem
    this.playing = false
  }
  play() {
    try {
      this.audioElem.play()
    } catch (e) {
      console.warn("Error while attempting to play, probably not a big deal")
    }
    this.playing = true
  }
  pause() {
    this.audioElem.pause()
    this.playing = false
  }
  addEventListener(type, callback) {
    this.audioElem.addEventListener(type, callback)
  }
  set src(src) {
    this.audioElem.src = src
    /*
    fetch(src)
      .then(response => response.blob())
      .then(audioBlob => {
        const audioBlobURL = URL.createObjectURL(audioBlob)
        this.audioElem.src = audioBlobURL
        if (this.playing) {
          this.audioElem.play()
        }
      })
      */
  }
  get currentSrc() {
    return this.audioElem.currentSrc
  }
  get duration() {
    return this.audioElem.duration
  }
  set currentTime(time) {
    this.audioElem.currentTime = time
  }
  get currentTime() {
    return this.audioElem.currentTime
  }
}
class Switch {
  constructor (domElements, text) {
    this.domElements = domElements
    this.state = false
    this.wrapperDOM = document.createElement("div")
    this.textDOM = document.createElement("p")
    this.switchDOM = document.createElement("div")
    this.sliderDOM = document.createElement("span")
    this.wrapperDOM.setAttribute("class", "switchwrapper")
    this.switchDOM.setAttribute("class", "switch")
    this.sliderDOM.setAttribute("class", "slider")
    this.wrapperDOM.appendChild(this.textDOM)
    this.textDOM.textContent = text
    this.wrapperDOM.appendChild(this.switchDOM)
    this.switchDOM.appendChild(this.sliderDOM)
    this.domElements.currentsong.switches.appendChild(this.wrapperDOM)
    this.switchDOM.addEventListener("mousedown", (e) => {this.switch(e)})
  }
  switch (e) {
    if (this.state) {
      this.ontooff()
    } else {
      this.offtoon()
    }
  }
  offtoon() {
    this.sliderDOM.style.left = "15px"
    this.switchDOM.style.backgroundColor = "#2DC964"
    this.state = true
  }
  ontooff () {
    this.sliderDOM.style.left = "0px"
    this.switchDOM.style.backgroundColor = "#fc0a02"
    this.state = false
  }
}
class Autoplay extends Switch {
  constructor(domElements, text) {
    super(domElements, text)
    this.offtoon()
  } 
  offtoon () {
    super.offtoon()
    this.domElements.currentsong.audio.setAttribute("autoplay", "autoplay")
  }
  ontooff () {
    super.ontooff()
    this.domElements.currentsong.audio.removeAttribute("autoplay")
  }
}
class Shuffle extends Switch {
  constructor(domElements, text, songControls) {
    super(domElements, text)
    this.songControls = songControls
  }
  offtoon () {
    super.offtoon()
    if (this.songControls.currentSong) this.songControls.playedIndices = [this.songControls.currentSong.index]
    else this.songControls.playedIndices = []
    this.songControls.playNext = async () => {await this.songControls.randomNext()}
    this.songControls.playPrevious = () => {this.songControls.randomPrevious()}
  }
  ontooff () {
    super.ontooff()
    this.songControls.playNext = async () => {await this.songControls.sequentialNext()}
    this.songControls.playPrevious = () => {this.songControls.sequentialPrevious()}
  }
}
async function main () {
  document.body.style.cursor = "wait"
  if (!localStorage.getItem("token")) {
    window.location = "../"
  }
  document.token = localStorage.getItem("token")
  document.refresh = localStorage.getItem("refresh")
  const currentsong = {
    currentsong: document.getElementById("currentsong"),
    iconImg: document.getElementById("iconImg"),
    songname: document.getElementById("songname"),
    audio: document.getElementById("audio"),
    previousarrow: document.getElementById("previous"),
    nextarrow: document.getElementById("next"), 
    controls: document.getElementById("controls"),
    switches: document.getElementById("switches"),
    playBtn: document.getElementById("playBtn"),
    timer: document.getElementById("timer"),
    progress: document.getElementById("progress"),
    player: document.getElementById("player"),
    volumeWarning: document.getElementById("volumeWarning")
  }
  const domElements = {
    sidebar: document.getElementById("accountinfo"),
    sidebarlist1: document.querySelector("#accountinfo ul.sidebarele1"),
    sidebarlist2: document.querySelector("#accountinfo ul.sidebarele2"),
    songlist: document.getElementById("songlist"),
    currentsong
  }
  const profile = await fetchProfile()
  const playlists = await getPlaylists(profile.id)
  populateElements(domElements,profile, playlists)
  document.body.style.cursor = "default"
}
async function login() {
  await new Promise((resolve, reject) => {
      window.addEventListener("tokensAquired", ()=>{
        resolve()
      })
      const popup = window.open("../login", "Spotify Login Window", `popup = true, height = 500, width = 500, top=${window.innerHeight/2-250}, left=${window.innerWidth/2-250}`)
      if (popup === null) {
        alert("Consider enabling popups for a better experience")
        window.location = "../"
      }
    })
    localStorage.setItem("refresh", window.refresh)
    localStorage.setItem("token", window.token)
    document.token = window.token
    document.refresh = window.refresh
}
async function refreshToken(refresh) {
  const result = await fetch(`https://spotify.catmajor.repl.co/refresh_token?refresh_token=${refresh}`)
  const response = await result.json()
  if (response.error) {
    console.log(response.error)
    await login()
  } else {
    document.token = response.access_token
    localStorage.setItem("token", response.access_token) 
  }
  console.log(response)
  return response
}
async function fetchProfile() {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET", headers: { Authorization: `Bearer ${document.token}` }
  });
  const response = await result.json()
  if (response.error) {
    console.log(response.error)
    await refreshToken(document.refresh)
    return fetchProfile()
  }
  return response;
}
async function getPlaylists(userid) {
  const result = await fetch(`https://api.spotify.com/v1/users/${userid}/playlists
`, {
    method: "GET", headers: {Authorization: `Bearer ${document.token}`}
   }) 
  try {
    const response = await result.json()
    if (response.error) {
      console.log(response.error)
      await refreshToken(document.refresh)
      return getPlaylists(userid)
    }
    return response
  } catch (e) {
    if (result.status === 403) {
      document.body.innerHTML = "<div class='cannot_access'>Your account is not on the whitelist, ask me to add you to the whitelist if you want access to songs<br>Click on this to log out</div>"
      document.querySelector(".cannot_access").addEventListener("mousedown", () => {
        localStorage.clear()
        window.location = "https://spotify.com/logout"
      })
    }
  }
}
async function getSpecificPlaylist(id) {
  const result = await fetch(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
    method: "GET", headers: {Authorization: `Bearer ${document.token}`}
   }) 
  const response = await result.json()
  if (response.error&&document.refresh) {
    await refreshToken(document.refresh)
    return getSpecificPlaylist(id)
  }
  return response;
}
async function getSong(href) {
  const result = await fetch(href, {
    method: "GET", headers: {Authorization: `Bearer ${document.token}`}
  })
  const response = await result.json()
  if (response.error&&document.refresh) {
    await refreshToken(document.refresh)
    return getSong(href)
  }
  return response
}
async function getSongInfo (id) {
  const result = await fetch(`https://spotify.catmajor.repl.co/songs/info?song=${id}`)
  const response = await result.json()
  return response
}
function populateElements (domElements, profile, playlists) {
  document.displayname = profile.display_name
  document.country = profile.country
  new SideBarEle(domElements.sidebarlist1, `${document.displayname}`, 0)
  new SideBarEle(domElements.sidebarlist1, `From ${document.country}`, 0)
  const back = new SideBarEle(domElements.sidebarlist1, "Back To Home", 0)
  const logout = new SideBarEle(domElements.sidebarlist1, `Log Out`, 0)
  back.DOM.setAttribute('class', 'hoverable')
  logout.DOM.setAttribute('class', 'hoverable')
  back.DOM.addEventListener("mousedown", (e) => {
    window.location = "../"
  })
  logout.DOM.addEventListener("mousedown", (e) => {
    localStorage.clear()
    window.location = ("https://spotify.com/logout")
  })
  new SideBarEle(domElements.sidebarlist2, `Playlists:`, 0)
  const songControls = new SongControls(domElements)
  let playlistList = []
  for (let i = 0; i<playlists.total; i++) {
    temp = new PlaylistBar(document.token, playlistList, domElements.sidebarlist2, `${i+1}: ${playlists.items[i].name}`, i, playlists.items[i], domElements.songlist, domElements.currentsong, songControls)
    temp.DOM.setAttribute('class', 'hoverable')
    playlistList.push(temp)
  }
}
const url = new URL(window.location)
let requestTicker = 0
document.addEventListener("onpageload", main())