import fetch from "node-fetch";
import huejay from "huejay";

const pingApi = "https://gondul-api.sklirg.io/ping-health";

// Config of bridge
const hue_bridge = process.env.GONDUL_HUE_BRIDGE || "";
// const hue_port =
const username = process.env.GONDUL_HUE_USERNAME || "";

const lightId = process.env.GONDUL_HUE_LIGHT_NO || "7";

function createHueClient() {
  return new huejay.Client({
    host: hue_bridge,
    username
  });
}

const client = createHueClient();

let errorCount = 0;
let acceptableErrors = 5;
setInterval(async () => {
  try {
    const pingHealth = await fetch(
      `${pingApi}?okScore=10&fairScore=100&warningScore=400&criticalScore=800`
    );
    if (await pingHealth.ok) {
      const data = await pingHealth.json();
      const { ok, fair, warning, critical, error } = data;

      if (error && error.length !== 0) {
        console.error("Error from API", error);
      } else {
        console.log(
          `Fetched
        ${ok.length} OKs;
        ${fair.length} FAIRs;
        ${warning.length} WARNINGs;
        ${critical.length} CRITICALs`
        );
        // console.log(ok[0]);

        // const findItem = "e59-1";
        // console.log(ok.filter(sw => sw.sw === findItem));
        // console.log(fair.filter(sw => sw.sw === findItem));
        // console.log(warning.filter(sw => sw.sw === findItem));
        // console.log(critical.filter(sw => sw.sw === findItem));

        const acceptableWarnings = 0;
        // WiFi controller is always critical
        const acceptableCriticals = 1;

        if (
          warning.length > acceptableWarnings ||
          critical.length > acceptableCriticals
        ) {
          errorCount++;
          console.log(`Criticals (${critical.length}):`, critical);
          console.log(`Warnings (${warning.length}):`, warning);
          if (errorCount > acceptableErrors) {
            console.log(`Received ${errorCount} in a row - triggering light`);
            setLightToAlert(client);
          }
        } else {
          errorCount = 0;
          setLightToOk(client);
        }
      }
    }
  } catch (err) {
    console.error(
      "Error during fetch -- maybe I lost connection to the Internet?",
      err
    );
    errorCount++;
    if (errorCount > acceptableErrors) {
      setLightToAlert(client);
    }
  }
}, 1000);

async function addHueUser(client) {
  try {
    const user = new client.users.User();
    setTimeout(async () => {
      try {
        const newUser = await client.users.create(user);

        console.log("created new user", newUser, newUser.username);
      } catch (err) {
        console.err("creating er", err);
      }
    }, 10000);
    console.log("created new user maybe?");
  } catch (err) {
    console.error(err);
  }
}
// addHueUser(createHueClient());

async function getLights(client) {
  try {
    const lights = await client.lights.getAll();
    const on = lights.filter(l => l.on);
    console.log("got lights", on[0].id);
    console.log("got lights", on[0].hue);
    console.log("got lights", on[0].saturation);
    console.log("got lights", on[0].xy);
    console.log("got lights", on[0].colorMode);
    console.log("got lights", on[0].colorTemp);
  } catch (err) {
    console.error("failed getting lights", err);
  }
}
// getLights(client);

async function getAlertLight(client) {
  try {
    const light = client.lights.getById(lightId);
    // console.log("got alert light", light);
    return Promise.resolve(light);
  } catch (err) {
    console.error("failed to get light by id");
    return Promise.reject(err);
  }
}
// getAlertLight(client);

async function setLightToAlert(client) {
  try {
    let light = await getAlertLight(client);
    light.brightness = 254;
    light.hue = 46925;
    light.saturation = 254;
    light.xy = [0.6203, 0.2922];
    client.lights.save(light);
  } catch (err) {
    return Promise.reject(err);
  }
}

// setLightToAlert(client);

async function setLightToOk(client) {
  try {
    let light = await getAlertLight(client);
    if (light.xy[0] !== 0.1971) {
      light.brightness = 150;
      light.hue = 44570;
      light.saturation = 254;
      light.xy = [0.1971, 0.988];
      client.lights.save(light);
    }
  } catch (err) {
    return Promise.reject(err);
  }
}
// setLightToOk(client);
