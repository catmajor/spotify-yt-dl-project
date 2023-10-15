const fs = require('fs');
const normalize = require('ffmpeg-normalize');

class AudioProcessor {
  constructor (logger, replit_db) {
    this.logger = logger
    this.db = replit_db
  }
  async normalize (spotifyID) {
    const songsAtIndex = await this.db.get(spotifyID[0])
    this.logger.rec(`Started Normalizing ${songsAtIndex[spotifyID][1]}`)
    normalize({
      input: `cached/${spotifyID}.webm`,
      output: `temp/${spotifyID}.webm`,
      loudness: {
        normalization: 'ebuR128',
        target:
        {
          input_i: -23,
          input_lra: 7.0,
          input_tp: -2.0
        }
      },
      verbose: false
    })
    .then(normalized  => {
      fs.writeFileSync(`songs/${spotifyID}.webm`, "")
      const stream = fs.createReadStream(`temp/${spotifyID}.webm`)
      stream.on('data', chunk => {
        fs.appendFileSync(`songs/${spotifyID}.webm`, chunk)
      
      })
      stream.on('end', () => {
        fs.unlinkSync(`temp/${spotifyID}.webm`)
        fs.unlinkSync(`cached/${spotifyID}.webm`)
        this.logger.rec(`Done Normalizing ${songsAtIndex[spotifyID][1]}`)
      })
    })
    .catch(error => {
      this.logger.rec(`Error In Normalizing ${songsAtIndex[spotifyID][1]} With Error ${error}`)
      try {
        fs.unlinkSync(`temp/${spotifyID}.webm`)
      } catch (e) {}
      try {
        fs.unlinkSync(`songs/${spotifyID}.webm`)
      } catch (e) {}
      try {
        fs.unlinkSync(`cached/${spotifyID}.webm`)
      } catch (e) {}
    });
  }
}

module.exports = AudioProcessor