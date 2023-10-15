const readline = require("readline")
const {stdin, stdout} = require('node:process')
const replit_db = require("@replit/database")
const db = new replit_db()
const fs = require("fs")

class Logs {
  constructor() {
    const rl = readline.createInterface({input: stdin, output: stdout})
    let questionOpen = false
    const logger = this
    rl.on('line', async (input) => {
      if (questionOpen||input==="") return
      const splitInput = input.split(' ')
      switch (splitInput[0]) {
        case 'search':
          if (!splitInput[2]) {
            console.log("Missing args\n")
            break
          }
          let args = input.replace("search ", "")
          let searchTerm;
          switch(splitInput[1]) {
            case "name":
            case "spotifyID":
            case "ytID":
              searchTerm = args.replace(`${splitInput[1]} `, "")
              break
            default:
              console.log("Invalid Type\n")
              return
          }
          const type = splitInput[1]
          searchSong(searchTerm, type)
          break
        case 'index':
          if (!splitInput[1] || splitInput.length>2) {
            console.log("Missing args OR too many args")
            break
          }
          getIndex(splitInput[1])
          break
        case 'db':
          printDB()
          break
        case "change":
          if (!splitInput[2]) {
            console.log("Missing Args")
            break
          }
          console.log("Due to the danger of modifying this fragile codebase only modifying ytID is allowed")
          changeValue(splitInput[1], splitInput[2])
          break
        case "y":
          break
        case "n":
         break
        default: 
          console.log("\nNo Such Command Found\n")
      }
      /** 
      * Searches for a value in the Spotify songs stored in replit db
      * @param {string} value the value to search for in each database entry
      * @param {string} type the type for the value given above. Can be either name, spotifyID, or ytID
      * @return {string} first spotifyID of the song matching the value of the search paramters otherwise undefined
      */
      async function searchSong(value, type) {
        let ticker = 1
        let firstSong
        for (let i = (type==="spotifyID"?parseInt(value[0]):0); i < (type==="spotifyID"?parseInt(value[0])+1:8); i++) {
          let temp = await searchSongAtIndex(await db.get(i), value, type)
          firstSong = !firstSong?temp:firstSong
        }
        if (ticker === 1) console.log("No Songs Found\n")
        else console.log("")
        return firstSong
        /** 
        * After getting the entire object of all songs stored at the index of their first number, searches through those songs to find those that match.
        * @param {object} data value given back when calling db.get(first index of spotify id of songs)
        * @param {string} value value to search for
        * @param {string} type type of value to search for in each song
        * @return {string} string of spotifyID of first song matching string, otherwise undefined
        */
        async function searchSongAtIndex(data, value, type) {
          if (Object.keys(data).length === 0) return
          let firstSong
          Object.keys(data).forEach((spotifyID) => {
            if (songIncludesData(data, spotifyID, value, type)) {
              firstSong = !firstSong?spotifyID:firstSong
              let extraInfo = "none"
              if (data[spotifyID][2]) { 
                extraInfo = "|"
                Object.keys(data[spotifyID][2]).forEach((cur) => {extraInfo += ` ${cur}: ${data[spotifyID][2][cur]} |`})
              }
              console.log(`${ticker}| Name: ${data[spotifyID][1]}| Spotify ID: ${spotifyID} | YouTube ID: ${data[spotifyID][0]} | Extra Info: (${extraInfo})`)
              ticker++
            }
          })
          return firstSong
          function songIncludesData(data, spotifyID, value, type) {
            switch (type) {
              case "name":
                return data[spotifyID][1].toLowerCase().includes(value.toLowerCase())
              case "spotifyID":
                return spotifyID===value
              case "ytID":
                return data[spotifyID][0]===value
            }
          }
        }
      }
      async function getIndex(index) {
        const data = await db.get(index)
        if (Object.keys(data).length === 0) return 0
        let ticker = 1;
        Object.keys(data).forEach((spotifyID) => {
          let extraInfo = "none"
          if (data[spotifyID][2]) { 
                extraInfo = "|"
                Object.keys(data[spotifyID][2]).forEach((cur) => {extraInfo += ` ${cur}: ${data[spotifyID][2][cur]} |`})
              }
          console.log(`${ticker}| Name: ${data[spotifyID][1]}| Spotify ID: ${spotifyID} | YouTube ID: ${data[spotifyID][0]} | Extra Info: (${extraInfo})`)
          ticker++
        })
        return ticker
      }
      async function printDB() {
        let total = 0
        console.log("------------------------------")
        for (let i = 0; i<8; i++) {
          console.log(`At Index: ${i}\n------------------------------`)
          total += await getIndex(i)
          console.log("------------------------------")
        }
        console.log(`Total: ${total} Songs\n------------------------------`)
      }
      async function changeValue(spotifyID, ytID) {
        
        const songID = await searchSong(spotifyID, "spotifyID")
        if (songID!==spotifyID) {
          console.log(`Song with spotify ID ${spotifyID} is not in database`)
          return
        }
        let songsAtIndex = await db.get(parseInt(spotifyID[0]))
        const song = songsAtIndex[spotifyID]
        const songName = song[1]
        const songYTID = song[0]
        questionOpen = true
        stdout.write("Are you sure (y/n): ")
        rl.once("line", async (input)=> {
          questionOpen = false
          input = input.toLowerCase()
          switch (input) {
            case "":
            case "y":
            case "yes":
              songsAtIndex[spotifyID] = [ytID, songName]
              const time = new Date()
              fs.appendFileSync(`./logs/commandChangelog.txt`, `[${time.toUTCString()}] Changed ${songName} -- SpotifyID: ${spotifyID} -- ytID from ${songYTID} to ${ytID}\n`)
              try {
                fs.unlinkSync(`./songs/${spotifyID}.webm`)
              } catch (e) {
                console.log("Audio File not found, but db entry changed")
              }
              db.set(spotifyID[0], songsAtIndex)
              break
            case "n":
            case "no":
              console.log("Aborting")
              break
            default:
              console.log("Default to answer of no")
          }
        })
      }
    })
  }
  rec (text) {
    const time = new Date()
    console.log(`[${time.toUTCString()}] ${text}\n`)
    const year = time.getFullYear()
    const month = time.getMonth()+1
    const day = time.getDate()
    try {
      fs.appendFileSync(`./logs/${year}/${month}/${month}-${day}-${year}log.txt`, `[${time.toUTCString()}] ${text.toString()}\n`)
    } catch (e) {
      if (!fs.existsSync(`./logs/${year}`)) fs.mkdirSync(`./logs/${year}`)
      if (!fs.existsSync(`./logs/${year}/${month}`)) fs.mkdirSync(`./logs/${year}/${month}`)
      fs.writeFileSync(`./logs/${year}/${month}/${month}-${day}-${year}log.txt`, `[${time.toUTCString()}] ${text.toString()}\n`)
    }
  }
}

module.exports = Logs