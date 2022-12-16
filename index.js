const fs = require("fs");
const https = require("https");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const argFilename = process.argv[2];
const argMasterJson = process.argv[3];

const execute = async () => {
  if (!argFilename || !argMasterJson) {
    console.log(INSTRUCTIONS_TEXT);
    return;
  }

  const masterJson = toMasterJson();
  const jsonData = await getJsonData(masterJson);

  await processJsonData(jsonData, masterJson);
  await combineFiles(jsonData.clip_id, argFilename);
  await removeTempFiles(jsonData.clip_id);
};

const getJsonData = async (masterJson) => {
  let data = "";

  return new Promise((resolve, reject) => {
    https
      .get(masterJson, (res) => {
        res.on("data", (d) => (data += d));
        res.on("end", () => {
          return resolve(JSON.parse(data));
        });
      })
      .on("error", (err) => {
        return reject(err);
      });
  });
};

const processJsonData = async (data, masterJson) => {
  const videoData = data.video.pop();
  const audioData = data.audio.pop();
  const videoBaseUrl = toBaseUrl(videoData.base_url, data.base_url, masterJson);
  const audioBaseUrl = toBaseUrl(audioData.base_url, data.base_url, masterJson);

  return await Promise.all([
    processFile(videoBaseUrl, videoData, data.clip_id + ".m4v"),
    processFile(audioBaseUrl, audioData, data.clip_id + ".m4a"),
  ]);
};

const processFile = async (baseUrl, data, filename) => {
  if (fs.existsSync(filename)) {
    console.log(`${filename} already exists`);
    return;
  }
  const initBuffer = Buffer.from(data.init_segment, "base64");
  fs.writeFileSync(filename, initBuffer);

  const output = fs.createWriteStream(filename, { flags: "a" });
  const segmentsUrl = data.segments.map((seg) => baseUrl + seg.url);
  await joinSegments(filename, 0, segmentsUrl, output);
  return output.end();
};

const joinSegments = async (filename, i, segmentsUrl, output) => {
  return new Promise((resolve, reject) => {
    if (i >= segmentsUrl.length) {
      console.log(`${filename} download finished!`);
      return resolve();
    }

    console.log(`Downloading ${filename} segment ${i} ...`);
    https
      .get(segmentsUrl[i], (res) => {
        res.on("data", (d) => output.write(d));
        res.on("end", async () => {
          return resolve(
            await joinSegments(filename, i + 1, segmentsUrl, output)
          );
        });
      })
      .on("error", (err) => {
        return reject(err);
      });
  });
};

const combineFiles = async (clip_id, outputFilename) => {
  console.log("Combining files with ffmpeg ...");
  await exec(
    `ffmpeg -y -i ${clip_id}.m4v -i ${clip_id}.m4a -c copy ${outputFilename}.mp4`
  );
};

const removeTempFiles = async (clip_id) => {
  console.log("Removing temporary files ...");
  await exec(`rm -f ${clip_id}.m4v ${clip_id}.m4a`);
};

const toMasterJson = () => {
  return argMasterJson.endsWith("?base64_init=1")
    ? argMasterJson
    : `${argMasterJson}?base64_init=1}`;
};

const toBaseUrl = (typeBaseUrl, dataBaseUrl, masterJson) => {
  return new URL(typeBaseUrl, new URL(dataBaseUrl, masterJson));
};

execute();

const INSTRUCTIONS_TEXT = `Instructions:
  1. Open the browser developer console on the tab with the video. Filter "master.json" on Network dev tab.
  2. Start the video.
  3. Copy the full URL from "master.json".
  4. Run script as described below.

Two arguments are required:
  1. Output filename
  2. master.json URL

Example:
  node vimeo-downloader.js VIDEO NAME https://URL/master.json`;
