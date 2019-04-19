import express from "express";
import cors from "cors";
import fetch from "node-fetch";

import { pingInfo } from "@sklirg/gondul-health/src/nms-map-handlers.mjs";

const app = express();

app.use(cors());

const GONDUL_API = "https://gondul.tg19.gathering.org/api/";
const PING = "public/ping";

/*
 * Basic Gondul fetcher
 */
async function gondul(url, auth) {
  try {
    console.log("gondul");
    const resp = await fetch(url, {
      headers: {
        Authorization: auth
      }
    });

    console.log("gondul finish");

    if (await resp.ok) {
      console.log("gondul ok");
      return Promise.resolve(resp.json());
    }

    console.log("gondul not ok");
    return Promise.reject(new Error("Response not OK", resp));
  } catch (err) {
    return Promise.reject(err);
  }
}

/**
 * Handlers
 */
async function pingHealth(authHeader, config, sendPingData = false) {
  const defaultScoreValues = {
    okScore: 10,
    fairScore: 300,
    warningScore: 600,
    criticalScore: 800
  };

  const { okScore, fairScore, warningScore, criticalScore } = {
    ...defaultScoreValues,
    ...config
  };

  console.log(
    "pingHealth",
    okScore,
    fairScore,
    warningScore,
    criticalScore,
    config
  );
  const ret = {
    error: "",
    ping: [],
    ok: [],
    fair: [],
    warning: [],
    critical: []
  };
  try {
    const data = await gondul(`${GONDUL_API}${PING}`);
    console.log("pingHealth success");

    // console.log("ping resp", data);
    console.log("ping through handler");
    const health = Object.keys(data.switches).map(key => {
      // console.log(key);
      const sw = data.switches[key];
      const info = pingInfo(sw);
      // console.log("pingInfo", key, info);
      return { ...info, sw: key };
    });

    return Promise.resolve({
      ...ret,
      ping: sendPingData ? data.switches || [] : [],
      ok: health.filter(sw => sw.score < okScore),
      fair: health.filter(sw => sw.score >= okScore && sw.score < fairScore),
      warning: health.filter(
        sw => sw.score >= fairScore && sw.score < warningScore
      ),
      critical: health.filter(
        sw => sw.score >= warningScore && sw.score < criticalScore
      )
    });
  } catch (err) {
    console.log("pingHealth throw", err);
    return Promise.resolve({
      error: err.toString(),
      ping: []
    });
  }
}

app.get("/ping-health", async (req, resp) => {
  console.log("ping-health");
  resp.send(
    await pingHealth(
      req.headers.authorization,
      queryToConfig(req.query),
      req.query.all || false
    )
  );
});

function queryToConfig(q) {
  const query = { ...q };

  const config = Object.keys(query)
    .map(key =>
      !isNaN(parseInt(query[key])) ? [key, parseInt(query[key])] : null
    )
    .filter(o => o[1] !== null)
    .reduce((prev, current) => ({ ...prev, [current[0]]: current[1] }), {});

  console.log("parsed config", config);
  return config;

  // const config = {
  //   okScore: !isNan(parseInt(req.query.okScore))
  //     ? parseInt(req.query.okScore)
  //     : 5,
  //   fairScore: !isNan(parseInt(req.query.fairScore))
  //     ? parseInt(req.query.fairScore)
  //     : 10,
  //   warningScore: !isNan(parseInt(req.query.warningScore))
  //     ? parseInt(req.query.warningScore)
  //     : 15,
  //   criticalScore: !isNan(parseInt(req.query.criticalScore))
  //     ? parseInt(req.query.criticalScore)
  //     : 20
  // };

  // console.log("req query config", config);
  // return config;
}

app.listen(3000);
