require('dotenv').config();
const fetch = require('node-fetch') || globalThis.fetch;
async function test() {
    const eiaApiKey = process.env.EIA_API_KEY;
    const url = `https://api.eia.gov/v2/electricity/rto/region-sub-ba-data/data/?frequency=hourly&data[0]=value&facets[subba][]=COAS&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5&api_key=${eiaApiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    console.log(JSON.stringify(json.response.data, null, 2));
}
test();
